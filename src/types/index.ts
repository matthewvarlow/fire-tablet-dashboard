// Weather types
export interface WeatherCurrent {
  temp: number;
  high: number;
  low: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
}

export interface WeatherForecast {
  date: Date;
  temp: number;
  description: string;
  icon: string;
}

export interface WeatherData {
  current: WeatherCurrent;
  forecast: WeatherForecast[];
  location: string;
}

// Calendar types
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  colorId?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  weekStart: string;
  weekEnd: string;
}

// Component props
export interface WeatherProps {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
}

export interface CalendarProps {
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
}
