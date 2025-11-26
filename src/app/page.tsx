'use client';

import { useEffect, useState } from 'react';
import Weather from '@/components/Weather';
import Calendar from '@/components/Calendar';

interface WeatherData {
  current: {
    temp: number;
    high: number;
    low: number;
    description: string;
    icon: string;
    weatherId: number;
    humidity: number;
    windSpeed: number;
    windDeg: number;
    feelsLike: number;
    uvIndex: number | null;
    peakUV: number | null;
    peakUVTime: string | null;
    aqi: number | null;
    precipitationToday: string;
    nextSunEvent: {
      type: 'sunrise' | 'sunset';
      time: string;
    };
    moonPhase: {
      name: string;
      icon: string;
    };
  };
  hourly: Array<{
    time: string;
    temp: number;
    icon: string;
    weatherId: number;
    pop: number;
  }>;
  forecast: Array<{
    date: Date;
    temp: number;
    description: string;
    icon: string;
    weatherId: number;
    pop: number;
    precipitation: string;
  }>;
  location: string;
}

interface CalendarData {
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location?: string;
    description?: string;
    colorId?: string;
  }>;
  weekStart: string;
  weekEnd: string;
}

export default function Dashboard() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [weatherLastRefreshed, setWeatherLastRefreshed] = useState<Date | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);

  const fetchWeather = async () => {
    try {
      setWeatherError(null);
      const response = await fetch('/api/weather');
      if (!response.ok) {
        throw new Error('Failed to fetch weather');
      }
      const data = await response.json();
      setWeatherData(data);
      setWeatherLastRefreshed(new Date());
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeatherError('Failed to load weather data');
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchCalendar = async () => {
    try {
      setCalendarError(null);
      const response = await fetch(`/api/calendar?t=${Date.now()}`, {
        cache: 'no-store'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch calendar');
      }
      const data = await response.json();
      setCalendarData(data);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      setCalendarError('Failed to load calendar data');
    } finally {
      setCalendarLoading(false);
    }
  };

  // Check time and update night mode (after 11 PM)
  useEffect(() => {
    const checkNightMode = () => {
      const now = new Date();
      const hour = now.getHours();
      setIsNightMode(hour >= 23 || hour < 6); // 11 PM to 6 AM
    };

    // Check immediately
    checkNightMode();

    // Check every minute
    const interval = setInterval(checkNightMode, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchWeather();
    fetchCalendar();
  }, []);

  useEffect(() => {
    const scheduleNextWeatherRefresh = () => {
      const now = new Date();
      const currentMinutes = now.getMinutes();
      const currentSeconds = now.getSeconds();
      const currentMs = now.getMilliseconds();

      const minutesUntilNext = 5 - (currentMinutes % 5);
      const msUntilNext = (minutesUntilNext * 60 * 1000) - (currentSeconds * 1000) - currentMs;

      const timeoutId = setTimeout(() => {
        fetchWeather();
        const intervalId = setInterval(() => {
          fetchWeather();
        }, 300000);

        return () => clearInterval(intervalId);
      }, msUntilNext);

      return () => clearTimeout(timeoutId);
    };

    return scheduleNextWeatherRefresh();
  }, []);

  useEffect(() => {
    const scheduleNextCalendarRefresh = () => {
      const now = new Date();
      const currentSeconds = now.getSeconds();
      const currentMs = now.getMilliseconds();

      const msUntilNext = (60 * 1000) - (currentSeconds * 1000) - currentMs;

      const timeoutId = setTimeout(() => {
        fetchCalendar();
        const intervalId = setInterval(() => {
          fetchCalendar();
        }, 60000);

        return () => clearInterval(intervalId);
      }, msUntilNext);

      return () => clearTimeout(timeoutId);
    };

    return scheduleNextCalendarRefresh();
  }, []);

  return (
    <div id="display-container" className={`p-5 ${isNightMode ? 'night-mode' : ''}`}>
      <div className="grid grid-cols-[1fr_420px] h-full gap-5">
        {/* Left: Weather */}
        <div className="flex flex-col h-full">
          <Weather
            data={weatherData}
            loading={weatherLoading}
            error={weatherError}
            lastRefreshed={weatherLastRefreshed}
          />
        </div>

        {/* Right: Calendar */}
        <div className="flex flex-col h-full">
          <Calendar data={calendarData} loading={calendarLoading} error={calendarError} />
        </div>
      </div>
    </div>
  );
}
