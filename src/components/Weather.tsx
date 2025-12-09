'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import Image from 'next/image';
import WeatherIcon from './WeatherIcon';

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

interface WeatherProps {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastRefreshed: Date | null;
}

const getWindDirectionRotation = (degrees: number) => {
  const towardsDegrees = (degrees + 180) % 360;
  const directions = [0, 23, 45, 68, 90, 113, 135, 158, 180, 203, 225, 248, 270, 293, 315, 338];
  let closestAngle = 0;
  let minDiff = 360;
  for (const angle of directions) {
    let diff = Math.abs(towardsDegrees - angle);
    if (diff > 180) diff = 360 - diff;
    if (diff < minDiff) {
      minDiff = diff;
      closestAngle = angle;
    }
  }
  return closestAngle;
};

const getAQILabel = (aqi: number | null) => {
  if (aqi === null) return 'N/A';
  const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
  return labels[aqi] || 'N/A';
};

export default function Weather({ data, loading, error, lastRefreshed }: WeatherProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-tertiary">Loading weather...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-tertiary">Error loading weather</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Clock and Date Row */}
      <div className="grid gap-4" style={{ flexGrow: 1, flexShrink: 1, gridTemplateColumns: '1fr auto' }}>
        {/* Clock Card */}
        <div className="card card-elevated p-8 flex items-center justify-center">
          <div className="font-normal tracking-tight text-primary" style={{ fontSize: '11rem', lineHeight: '0.85', letterSpacing: '-0.02em' }}>
            {format(currentTime, 'h:mm')}
          </div>
        </div>

        {/* Calendar-Style Date Card - Square */}
        <div className="card-elevated overflow-hidden flex flex-col" style={{ aspectRatio: '1/1', height: '100%', borderRadius: '20px' }}>
          {/* Day of week header */}
          <div className="text-center py-6" style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div className="text-4xl font-semibold text-primary uppercase tracking-wide">
              {format(currentTime, 'EEEE')}
            </div>
          </div>

          {/* Large day number */}
          <div className="flex-1 flex items-center justify-center" style={{
            background: 'rgba(255, 255, 255, 0.03)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)'
          }}>
            <div className="font-light text-primary" style={{
              fontSize: '10rem',
              lineHeight: '0.85',
              letterSpacing: '-0.02em'
            }}>
              {format(currentTime, 'd')}
            </div>
          </div>
        </div>
      </div>

      {/* Current Weather Cards - Split into 2 */}
      <div className="grid grid-cols-2 gap-4" style={{ flexShrink: 0, height: '224px' }}>
        {/* Left: Current Condition */}
        <div className="card card-elevated p-6">
          <div className="relative flex items-center justify-center h-full gap-8">
            {/* H/L in top right corner */}
            <div className="absolute top-0 right-0">
              <div className="text-xl text-tertiary">
                {data.current.high}°/{data.current.low}°
              </div>
            </div>

            {/* Left side: Icon and description */}
            <div className="flex flex-col items-center gap-3">
              <WeatherIcon iconCode={data.current.icon} weatherId={data.current.weatherId} size={140} />
              <div className="text-xl text-tertiary capitalize">
                {data.current.description}
              </div>
            </div>

            {/* Right side: Temperature and feels like */}
            <div>
              <div className="text-8xl font-extralight text-primary" style={{ lineHeight: '0.9', letterSpacing: '-0.02em' }}>
                {data.current.temp}°
              </div>
              <div className="text-2xl font-medium text-secondary mt-3">
                Feels Like: {data.current.feelsLike}°
              </div>
            </div>
          </div>
        </div>

        {/* Right: Weather Details */}
        <div className="card card-elevated p-6">
          <div className="flex items-center justify-center h-full">
            <div className="grid grid-cols-3 gap-x-10 gap-y-5">
              {[
                { label: 'Precip.', value: `${data.current.precipitationToday} cm` },
                { label: 'Humidity', value: `${data.current.humidity}%` },
                {
                  label: 'Wind',
                  value: (
                    <div className="flex items-center gap-1.5">
                      <span>{data.current.windSpeed} k/h</span>
                      <Image
                        src="/weather-icons/wi-wind-deg.svg"
                        alt="Wind"
                        width={14}
                        height={14}
                        style={{ transform: `rotate(${getWindDirectionRotation(data.current.windDeg)}deg)`, filter: 'invert(1)', opacity: 0.7 }}
                      />
                    </div>
                  )
                },
                { label: 'UV Index', value: data.current.uvIndex ?? 'N/A' },
                { label: 'Air Quality', value: getAQILabel(data.current.aqi) },
                {
                  label: data.current.nextSunEvent.type === 'sunrise' ? 'Sunrise' : 'Sunset',
                  value: data.current.nextSunEvent.time
                },
              ].map((item, index) => (
                <div key={index} className="text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5">
                    {item.label}
                  </div>
                  <div className="text-lg font-medium text-primary">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Forecasts */}
      <div className="grid grid-cols-2 gap-4" style={{ flexShrink: 0, height: '224px' }}>
        {/* Hourly Forecast */}
        <div className="card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-5 ml-1">
            Hourly Forecast
          </h3>
          <div className="grid grid-cols-6 gap-3">
            {data.hourly.map((hour, index) => (
              <div key={index} className="flex flex-col items-center gap-2.5 px-1">
                <div className="text-sm font-medium text-tertiary" style={{ minWidth: '45px', textAlign: 'center' }}>
                  {hour.time}
                </div>
                <WeatherIcon iconCode={hour.icon} weatherId={hour.weatherId} size={36} />
                <div className="text-lg font-semibold text-primary">{hour.temp}°</div>
                <div className="text-xs text-tertiary">{hour.pop}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="card p-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-5 ml-1">
            7-Day Forecast
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {data.forecast.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-2.5 px-1">
                <div className="text-sm font-medium text-secondary">
                  {format(new Date(day.date), 'EEE')}
                </div>
                <WeatherIcon iconCode={day.icon} weatherId={day.weatherId} size={36} />
                <div className="text-lg font-semibold text-primary">{day.temp}°</div>
                <div className="text-xs text-tertiary">{day.pop}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
