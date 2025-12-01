import { NextResponse } from 'next/server';

// Calculate moon phase (0 = new moon, 0.5 = full moon)
function getMoonPhase(date: Date): { phase: number; name: string; emoji: string } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let c, e, jd;

  if (month < 3) {
    c = year - 1;
    e = month + 12;
  } else {
    c = year;
    e = month;
  }

  jd = Math.floor(365.25 * (c + 4716)) + Math.floor(30.6001 * (e + 1)) + day - 1524.5;

  // Days since known new moon (Jan 6, 2000)
  let daysSinceNew = jd - 2451549.5;

  // Normalize to lunar cycle (29.53 days)
  daysSinceNew = ((daysSinceNew % 29.53) + 29.53) % 29.53; // Handle negative values
  const phase = daysSinceNew / 29.53;

  let name = '';
  let emoji = '';

  if (phase < 0.0625 || phase >= 0.9375) {
    name = 'New Moon';
    emoji = '🌑';
  } else if (phase < 0.1875) {
    name = 'Waxing Crescent';
    emoji = '🌒';
  } else if (phase < 0.3125) {
    name = 'First Quarter';
    emoji = '🌓';
  } else if (phase < 0.4375) {
    name = 'Waxing Gibbous';
    emoji = '🌔';
  } else if (phase < 0.5625) {
    name = 'Full Moon';
    emoji = '🌕';
  } else if (phase < 0.6875) {
    name = 'Waning Gibbous';
    emoji = '🌖';
  } else if (phase < 0.8125) {
    name = 'Last Quarter';
    emoji = '🌗';
  } else {
    name = 'Waning Crescent';
    emoji = '🌘';
  }

  return { phase, name, emoji };
}

export async function GET() {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const lat = process.env.OPENWEATHERMAP_LAT;
  const lon = process.env.OPENWEATHERMAP_LON;

  if (!apiKey || !lat || !lon) {
    return NextResponse.json(
      { error: 'Missing OpenWeatherMap configuration' },
      { status: 500 }
    );
  }

  try {
    // Try One Call API 2.5 first (still free for some users)
    let oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&exclude=minutely,alerts`;
    let oneCallResponse = await fetch(oneCallUrl);

    // If 2.5 fails, try 3.0 (requires subscription)
    if (!oneCallResponse.ok) {
      oneCallUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&exclude=minutely,alerts`;
      oneCallResponse = await fetch(oneCallUrl);
    }

    if (!oneCallResponse.ok) {
      throw new Error('Failed to fetch One Call API data. This may require a paid subscription.');
    }

    const oneCallData = await oneCallResponse.json();

    // Fetch current weather for location name (One Call doesn't provide it)
    const currentWeatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const currentWeatherResponse = await fetch(currentWeatherUrl);
    const currentWeather = await currentWeatherResponse.json();

    // Fetch Air Quality Index
    let aqi = null;
    try {
      const aqiUrl = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;
      const aqiResponse = await fetch(aqiUrl);
      if (aqiResponse.ok) {
        const aqiData = await aqiResponse.json();
        aqi = aqiData.list[0].main.aqi; // 1-5 scale
      }
    } catch (error) {
      console.error('AQI fetch error:', error);
    }

    const current = oneCallData.current;
    const hourly = oneCallData.hourly;
    const daily = oneCallData.daily;

    // Get today's high/low from daily forecast
    const todayDaily = daily[0];
    const high = Math.round(todayDaily.temp.max);
    const low = Math.round(todayDaily.temp.min);

    // Get peak UV for today from daily forecast (max UV for the day)
    // The daily.uvi field contains the maximum UV index for the day
    const peakUVFormatted = todayDaily.uvi ? Math.round(todayDaily.uvi) : null;

    // Peak UV typically occurs around solar noon (roughly 12-2 PM)
    // We'll display "Peak" without specific time since daily data doesn't provide exact time
    const peakUVTimeFormatted = peakUVFormatted ? '' : null;

    // Calculate total precipitation expected today (in mm, convert to cm)
    const totalPrecipitation = (todayDaily.rain || 0) + (todayDaily.snow || 0);
    const precipitationCm = (totalPrecipitation / 10).toFixed(1); // mm to cm

    // Get next 6 hours of forecast
    const hourlyForecasts = hourly.slice(1, 7).map((item: any) => ({
      time: new Date(item.dt * 1000).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
        timeZone: 'America/Toronto'
      }),
      temp: Math.round(item.temp),
      icon: item.weather[0].icon,
      weatherId: item.weather[0].id,
      pop: Math.round((item.pop || 0) * 100), // Probability of precipitation as percentage
    }));

    // Get next 7 days forecast
    const dailyForecasts = daily.slice(1, 8).map((item: any) => ({
      date: new Date(item.dt * 1000),
      temp: Math.round(item.temp.day),
      description: item.weather[0].main,
      icon: item.weather[0].icon,
      weatherId: item.weather[0].id,
      pop: Math.round((item.pop || 0) * 100),
      precipitation: (((item.rain || 0) + (item.snow || 0)) / 10).toFixed(1), // mm to cm
    }));

    // Determine next sunrise or sunset
    const now = Date.now() / 1000; // Current time in Unix timestamp
    const sunrise = current.sunrise;
    const sunset = current.sunset;

    let nextSunEvent = {
      type: 'sunrise' as 'sunrise' | 'sunset',
      time: sunrise,
    };

    if (now < sunrise) {
      nextSunEvent = { type: 'sunrise', time: sunrise };
    } else if (now < sunset) {
      nextSunEvent = { type: 'sunset', time: sunset };
    } else {
      // After sunset, show tomorrow's sunrise
      nextSunEvent = { type: 'sunrise', time: daily[1].sunrise };
    }

    // Get moon phase from API (more accurate than calculation)
    const apiMoonPhase = daily[0].moon_phase || 0; // 0-1 scale from API

    // Convert API moon phase to name and icon using 28-phase system
    // Moon phase scale: 0 = New Moon, 0.25 = First Quarter, 0.5 = Full Moon, 0.75 = Last Quarter, 1.0 = New Moon
    // Map to 28 icons (0-27) for enhanced accuracy
    const phaseIndex = Math.floor(apiMoonPhase * 28) % 28;

    let moonPhaseName = '';
    let moonPhaseIcon = '';

    // New Moon
    if (phaseIndex === 0) {
      moonPhaseName = 'New Moon';
      moonPhaseIcon = 'moon-alt-new';
    }
    // Waxing Crescent (phases 1-6)
    else if (phaseIndex >= 1 && phaseIndex <= 6) {
      moonPhaseName = 'Waxing Crescent';
      moonPhaseIcon = `moon-alt-waxing-crescent-${phaseIndex}`;
    }
    // First Quarter
    else if (phaseIndex === 7) {
      moonPhaseName = 'First Quarter';
      moonPhaseIcon = 'moon-alt-first-quarter';
    }
    // Waxing Gibbous (phases 1-6)
    else if (phaseIndex >= 8 && phaseIndex <= 13) {
      moonPhaseName = 'Waxing Gibbous';
      moonPhaseIcon = `moon-alt-waxing-gibbous-${phaseIndex - 7}`;
    }
    // Full Moon
    else if (phaseIndex === 14) {
      moonPhaseName = 'Full Moon';
      moonPhaseIcon = 'moon-alt-full';
    }
    // Waning Gibbous (phases 1-6)
    else if (phaseIndex >= 15 && phaseIndex <= 20) {
      moonPhaseName = 'Waning Gibbous';
      moonPhaseIcon = `moon-alt-waning-gibbous-${phaseIndex - 14}`;
    }
    // Third Quarter
    else if (phaseIndex === 21) {
      moonPhaseName = 'Third Quarter';
      moonPhaseIcon = 'moon-alt-third-quarter';
    }
    // Waning Crescent (phases 1-6)
    else {
      moonPhaseName = 'Waning Crescent';
      moonPhaseIcon = `moon-alt-waning-crescent-${phaseIndex - 21}`;
    }

    const weatherData = {
      current: {
        temp: Math.round(current.temp),
        high,
        low,
        description: current.weather[0].main,
        icon: current.weather[0].icon,
        weatherId: current.weather[0].id,
        humidity: current.humidity,
        windSpeed: Math.round(current.wind_speed * 3.6), // Convert m/s to km/h
        windDeg: current.wind_deg || 0,
        feelsLike: Math.round(current.feels_like),
        uvIndex: Math.round(current.uvi),
        peakUV: peakUVFormatted,
        peakUVTime: peakUVTimeFormatted,
        aqi,
        precipitationToday: precipitationCm,
        nextSunEvent: {
          type: nextSunEvent.type,
          time: new Date(nextSunEvent.time * 1000).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
            timeZone: 'America/Toronto'
          })
        },
        moonPhase: {
          name: moonPhaseName,
          icon: moonPhaseIcon,
        }
      },
      hourly: hourlyForecasts,
      forecast: dailyForecasts,
      location: currentWeather.name,
    };

    return NextResponse.json(weatherData);
  } catch (error) {
    console.error('Weather API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weather data. One Call API may require a paid subscription.' },
      { status: 500 }
    );
  }
}
