import { NextResponse } from 'next/server';

export async function GET() {
  // Return the environment variables (masked for security)
  const lat = process.env.OPENWEATHERMAP_LAT;
  const lon = process.env.OPENWEATHERMAP_LON;
  const city = process.env.OPENWEATHERMAP_CITY;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  return NextResponse.json({
    lat: lat || 'NOT SET',
    lon: lon || 'NOT SET',
    city: city || 'NOT SET',
    apiKeyExists: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    // Show first 4 chars of API key to verify it's correct
    apiKeyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
