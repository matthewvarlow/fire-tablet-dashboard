// Enhanced mapping from OpenWeatherMap condition IDs to weather-icons SVG filenames
// Based on https://openweathermap.org/weather-conditions

const owmIconMap: { [key: string]: string } = {
  // Fallback icon-based mapping (used when weatherId not available)
  '01d': 'day-sunny',
  '01n': 'night-clear',
  '02d': 'day-cloudy',
  '02n': 'night-alt-partly-cloudy',
  '03d': 'cloud',
  '03n': 'night-alt-cloudy',
  '04d': 'cloudy',
  '04n': 'cloudy',
  '09d': 'day-showers',
  '09n': 'night-alt-showers',
  '10d': 'day-rain',
  '10n': 'night-alt-rain',
  '11d': 'day-thunderstorm',
  '11n': 'night-alt-thunderstorm',
  '13d': 'day-snow',
  '13n': 'night-alt-snow',
  '50d': 'day-fog',
  '50n': 'night-fog',
};

/**
 * Get the weather icon filename using detailed OpenWeatherMap condition ID
 * @param iconCode - OWM icon code like '01d', '10n', etc.
 * @param weatherId - OWM condition ID (200-804)
 * @returns SVG filename without extension
 */
export function getWeatherIconName(iconCode: string, weatherId?: number): string {
  const isNight = iconCode?.includes('n');

  // If no weatherId provided, use simple icon-based mapping
  if (!weatherId) {
    return owmIconMap[iconCode] || 'day-sunny';
  }

  // Thunderstorm (200-232)
  if (weatherId >= 200 && weatherId < 300) {
    // Light thunderstorms
    if (weatherId === 200 || weatherId === 210 || weatherId === 230) {
      return isNight ? 'night-alt-snow-thunderstorm' : 'day-snow-thunderstorm';
    }
    // Moderate thunderstorms
    if (weatherId === 201 || weatherId === 211 || weatherId === 231) {
      return isNight ? 'night-alt-storm-showers' : 'day-storm-showers';
    }
    // Heavy/ragged thunderstorms (202, 212, 221, 232)
    return isNight ? 'night-alt-thunderstorm' : 'day-thunderstorm';
  }

  // Drizzle (300-321)
  if (weatherId >= 300 && weatherId < 400) {
    // Light drizzle
    if (weatherId === 300 || weatherId === 310) {
      return isNight ? 'night-alt-sprinkle' : 'day-sprinkle';
    }
    // Heavy drizzle
    if (weatherId === 302 || weatherId === 312 || weatherId === 314) {
      return isNight ? 'night-alt-rain' : 'day-rain';
    }
    // Moderate drizzle/showers (301, 311, 313, 321)
    return isNight ? 'night-alt-showers' : 'day-showers';
  }

  // Rain (500-531)
  if (weatherId >= 500 && weatherId < 600) {
    // Light rain
    if (weatherId === 500 || weatherId === 520) {
      return isNight ? 'night-alt-sprinkle' : 'day-sprinkle';
    }
    // Moderate rain
    if (weatherId === 501 || weatherId === 521) {
      return isNight ? 'night-alt-showers' : 'day-showers';
    }
    // Freezing rain
    if (weatherId === 511) {
      return isNight ? 'night-alt-rain-mix' : 'day-rain-mix';
    }
    // Heavy rain (502, 503, 504, 522, 531)
    return isNight ? 'night-alt-rain' : 'day-rain';
  }

  // Snow (600-622)
  if (weatherId >= 600 && weatherId < 700) {
    // Heavy snow (no day/night variant)
    if (weatherId === 602 || weatherId === 622) {
      return 'snowflake-cold';
    }
    // Sleet
    if (weatherId === 611 || weatherId === 612 || weatherId === 613) {
      return isNight ? 'night-alt-sleet' : 'day-sleet';
    }
    // Rain and snow mix
    if (weatherId === 615 || weatherId === 616) {
      return isNight ? 'night-alt-rain-mix' : 'day-rain-mix';
    }
    // Regular/light snow (600, 620, 621)
    if (weatherId === 600 || weatherId === 620 || weatherId === 621) {
      return isNight ? 'night-alt-snow' : 'day-snow';
    }
    // Default snow (601)
    return isNight ? 'night-alt-snow-wind' : 'day-snow-wind';
  }

  // Atmosphere (701-781)
  if (weatherId >= 700 && weatherId < 800) {
    // Mist/Fog
    if (weatherId === 701 || weatherId === 741) {
      return isNight ? 'night-fog' : 'day-fog';
    }
    // Smoke
    if (weatherId === 711) {
      return 'smoke';
    }
    // Haze (day only)
    if (weatherId === 721) {
      return 'day-haze';
    }
    // Sand/dust whirls & dust
    if (weatherId === 731 || weatherId === 761) {
      return 'dust';
    }
    // Sand
    if (weatherId === 751) {
      return 'sandstorm';
    }
    // Volcanic ash
    if (weatherId === 762) {
      return 'volcano';
    }
    // Squalls
    if (weatherId === 771) {
      return isNight ? 'night-alt-rain-wind' : 'day-rain-wind';
    }
    // Tornado
    if (weatherId === 781) {
      return 'tornado';
    }
    // Fallback for any other atmosphere conditions
    return isNight ? 'night-fog' : 'day-haze';
  }

  // Clear (800)
  if (weatherId === 800) {
    return isNight ? 'night-clear' : 'day-sunny';
  }

  // Clouds (801-804)
  if (weatherId > 800 && weatherId < 900) {
    // Few clouds
    if (weatherId === 801) {
      return isNight ? 'night-alt-cloudy-high' : 'day-cloudy-high';
    }
    // Scattered clouds
    if (weatherId === 802) {
      return isNight ? 'night-alt-cloudy' : 'day-cloudy';
    }
    // Broken clouds
    if (weatherId === 803) {
      return 'cloudy';
    }
    // Overcast clouds
    if (weatherId === 804) {
      return 'cloud';
    }
  }

  // Fallback to icon-based mapping
  return owmIconMap[iconCode] || 'day-sunny';
}

/**
 * Get the full path to the weather icon SVG
 * @param iconCode - OWM icon code like '01d', '10n', etc.
 * @param weatherId - Optional OWM condition ID (200-804)
 * @returns Path to SVG file in public folder
 */
export function getWeatherIconPath(iconCode: string, weatherId?: number): string {
  const iconName = getWeatherIconName(iconCode, weatherId);
  return `/weather-icons/wi-${iconName}.svg`;
}
