import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import ICAL from 'ical.js';

// Function to fetch and parse iCal feed
async function fetchICalEvents(icalUrl: string, weekStart: Date, weekEnd: Date, calendarIndex: number) {
  try {
    const response = await fetch(icalUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch iCal: ${response.status}`);
    }

    const icalData = await response.text();
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const events = vevents.map((vevent) => {
      const event = new ICAL.Event(vevent);
      const startDate = event.startDate.toJSDate();
      const endDate = event.endDate.toJSDate();

      // Filter events within the week range
      if (endDate < weekStart || startDate > weekEnd) {
        return null;
      }

      return {
        id: event.uid,
        title: event.summary || 'Untitled',
        start: event.startDate.toJSDate().toISOString(),
        end: event.endDate.toJSDate().toISOString(),
        allDay: event.startDate.isDate, // iCal uses isDate for all-day events
        location: event.location,
        description: event.description,
        colorId: undefined,
        calendarIndex: calendarIndex,
      };
    }).filter(event => event !== null);

    return events;
  } catch (error) {
    console.error(`Error fetching iCal from ${icalUrl}:`, error);
    return [];
  }
}

export async function GET() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const calendarIds = process.env.GOOGLE_CALENDAR_IDS;
  const icalUrls = process.env.ICAL_URLS; // New env variable for iCal URLs

  if (!clientEmail || !privateKey || !calendarIds) {
    return NextResponse.json(
      { error: 'Missing Google Calendar configuration' },
      { status: 500 }
    );
  }

  try {
    // Create JWT auth client
    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    });

    const calendar = google.calendar({ version: 'v3', auth });

    // Get events for current week
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday

    // Split calendar IDs and fetch events from all calendars
    const calendarIdArray = calendarIds.split(',').map(id => id.trim());

    // Fetch events from all calendars in parallel
    const allCalendarPromises = calendarIdArray.map(async (calendarId, calendarIndex) => {
      try {
        const response = await calendar.events.list({
          calendarId: calendarId,
          timeMin: weekStart.toISOString(),
          timeMax: weekEnd.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
        });

        return response.data.items?.map((event) => ({
          id: event.id,
          title: event.summary || 'Untitled',
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          allDay: !event.start?.dateTime,
          location: event.location,
          description: event.description,
          colorId: event.colorId,
          calendarIndex: calendarIndex, // Track which calendar this event belongs to
        })) || [];
      } catch (error) {
        console.error(`Error fetching calendar ${calendarId}:`, error);
        return []; // Return empty array if a calendar fails
      }
    });

    // Wait for all calendar fetches to complete
    const allCalendarEvents = await Promise.all(allCalendarPromises);

    // Flatten and merge all events from all Google calendars
    const googleEvents = allCalendarEvents.flat();

    // Fetch iCal events if ICAL_URLS is configured
    let icalEvents: any[] = [];
    if (icalUrls) {
      const icalUrlArray = icalUrls.split(',').map(url => url.trim());
      const icalCalendarIndex = calendarIdArray.length; // Start indexing after Google calendars

      const icalPromises = icalUrlArray.map(async (icalUrl, index) => {
        return await fetchICalEvents(icalUrl, weekStart, weekEnd, icalCalendarIndex + index);
      });

      const allICalEvents = await Promise.all(icalPromises);
      icalEvents = allICalEvents.flat();
    }

    // Merge Google Calendar and iCal events
    const events = [...googleEvents, ...icalEvents];

    // Sort all events by start time
    events.sort((a, b) => {
      const aStart = new Date(a.start).getTime();
      const bStart = new Date(b.start).getTime();
      return aStart - bStart;
    });

    const response = NextResponse.json({
      events,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    });

    // Disable caching to ensure fresh data
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error) {
    console.error('Calendar API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar data' },
      { status: 500 }
    );
  }
}
