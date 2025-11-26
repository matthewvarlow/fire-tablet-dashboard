import Image from 'next/image';
import { getWeatherIconPath } from '@/utils/weatherIcons';

interface WeatherIconProps {
  iconCode: string;
  weatherId?: number;
  size?: number;
  className?: string;
  alt?: string;
}

/**
 * WeatherIcon component that displays SVG weather icons based on OpenWeatherMap data
 * Uses enhanced mapping with condition IDs for more accurate icon representation
 * Falls back to icon code mapping if weatherId not provided
 * Icons are inverted to white for dark mode
 */
export default function WeatherIcon({
  iconCode,
  weatherId,
  size = 48,
  className = '',
  alt = 'Weather icon'
}: WeatherIconProps) {
  const iconPath = getWeatherIconPath(iconCode, weatherId);

  return (
    <Image
      src={iconPath}
      alt={alt}
      width={size}
      height={size}
      className={className}
      style={{ filter: 'invert(1) brightness(1.1)' }}
      priority
    />
  );
}
