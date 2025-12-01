import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { startOfWeek, endOfWeek } from 'date-fns';

const TIMEZONE = 'America/Toronto';

export async function GET() {
  // Return the environment variables (masked for security)
  const lat = process.env.OPENWEATHERMAP_LAT;
  const lon = process.env.OPENWEATHERMAP_LON;
  const city = process.env.OPENWEATHERMAP_CITY;
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarIds = process.env.GOOGLE_CALENDAR_IDS;

  const debugInfo: any = {
    weather: {
      lat: lat || 'NOT SET',
      lon: lon || 'NOT SET',
      city: city || 'NOT SET',
      apiKeyExists: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 4) + '...' : 'NOT SET',
    },
    calendar: {
      clientEmailExists: !!clientEmail,
      privateKeyExists: !!privateKey,
      calendarIds: calendarIds || 'NOT SET',
      calendarCount: calendarIds ? calendarIds.split(',').length : 0,
    },
    timezone: TIMEZONE,
    nodeEnv: process.env.NODE_ENV,
  };

  // Try to fetch calendar events with detailed logging
  if (clientEmail && privateKey && calendarIds) {
    try {
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      const calendar = google.calendar({ version: 'v3', auth });

      const nowUTC = new Date();
      const nowEST = toZonedTime(nowUTC, TIMEZONE);
      const weekStartEST = startOfWeek(nowEST, { weekStartsOn: 0 });
      const weekEndEST = endOfWeek(nowEST, { weekStartsOn: 0 });
      const weekStart = fromZonedTime(weekStartEST, TIMEZONE);
      const weekEnd = fromZonedTime(weekEndEST, TIMEZONE);

      debugInfo.timeInfo = {
        nowUTC: nowUTC.toISOString(),
        nowEST: nowEST.toISOString(),
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
      };

      const calendarIdArray = calendarIds.split(',').map(id => id.trim());
      const allEvents: any[] = [];

      for (const calendarId of calendarIdArray) {
        try {
          const response = await calendar.events.list({
            calendarId: calendarId,
            timeMin: weekStart.toISOString(),
            timeMax: weekEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
          });

          const events = response.data.items?.map((event) => ({
            calendar: calendarId,
            title: event.summary || 'Untitled',
            start: event.start?.dateTime || event.start?.date,
            end: event.end?.dateTime || event.end?.date,
            allDay: !event.start?.dateTime,
          })) || [];

          allEvents.push(...events);
        } catch (error: any) {
          debugInfo.calendarErrors = debugInfo.calendarErrors || [];
          debugInfo.calendarErrors.push({
            calendarId,
            error: error.message,
          });
        }
      }

      debugInfo.eventsFound = allEvents.length;
      debugInfo.events = allEvents;
    } catch (error: any) {
      debugInfo.calendarError = error.message;
    }
  }

  return NextResponse.json(debugInfo, { status: 200 });
}
