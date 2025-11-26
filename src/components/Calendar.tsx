'use client';

import { useState, useEffect, useRef } from 'react';
import { format, addDays, parseISO, differenceInMinutes, isSameDay, startOfDay, isToday, isTomorrow } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  colorId?: string;
  calendarIndex?: number;
}

interface CalendarData {
  events: CalendarEvent[];
  weekStart: string;
  weekEnd: string;
}

interface CalendarProps {
  data: CalendarData | null;
  loading: boolean;
  error: string | null;
}

const CALENDAR_COLORS = [
  { bg: 'rgba(10, 132, 255, 0.15)', border: '#0a84ff', text: '#64d2ff' },
  { bg: 'rgba(255, 69, 58, 0.15)', border: '#ff453a', text: '#ff6961' },
  { bg: 'rgba(255, 214, 10, 0.15)', border: '#ffd60a', text: '#ffd60a' },
  { bg: 'rgba(100, 210, 255, 0.15)', border: '#64d2ff', text: '#64d2ff' },
  { bg: 'rgba(26, 45, 79, 0.5)', border: '#1A2D4F', text: '#7a9fd4' }, // Dark Blue - Work
  { bg: 'rgba(255, 159, 10, 0.15)', border: '#ff9f0a', text: '#ff9f0a' },
  { bg: 'rgba(48, 209, 88, 0.15)', border: '#30d158', text: '#30d158' },
  { bg: 'rgba(172, 142, 104, 0.15)', border: '#ac8e68', text: '#ac8e68' },
];

const DEFAULT_COLOR = { bg: 'rgba(142, 142, 147, 0.15)', border: '#8e8e93', text: '#8e8e93' };

interface PositionedEvent extends CalendarEvent {
  column: number;
  totalColumns: number;
}

export default function Calendar({ data, loading, error }: CalendarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleContainerRef = useRef<HTMLDivElement | null>(null);
  const tomorrowTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle toggle between today and tomorrow
  const handleTomorrowClick = () => {
    setShowTomorrow(!showTomorrow);

    // Clear existing timeout
    if (tomorrowTimeoutRef.current) {
      clearTimeout(tomorrowTimeoutRef.current);
    }

    // If switching to tomorrow view, set timeout to revert back
    if (!showTomorrow) {
      tomorrowTimeoutRef.current = setTimeout(() => {
        setShowTomorrow(false);
      }, 30000); // Revert after 30 seconds
    }
  };

  // Auto-scroll to current time indicator (only when showing today)
  useEffect(() => {
    if (!showTomorrow && !isUserScrolling && scheduleContainerRef.current && data) {
      const today = startOfDay(currentTime);

      // Get today's timed events
      const todayEvents = data.events.filter(event => {
        const eventStart = parseISO(event.start);
        return isSameDay(eventStart, today) && !event.allDay;
      });

      if (todayEvents.length === 0) return;

      // Calculate earliest and latest hours
      let earliestHour = 9;
      let latestHour = 17;

      todayEvents.forEach(event => {
        const eventStart = parseISO(event.start);
        const eventEnd = parseISO(event.end);
        earliestHour = Math.min(earliestHour, eventStart.getHours());
        latestHour = Math.max(latestHour, eventEnd.getHours() + (eventEnd.getMinutes() > 0 ? 1 : 0));
      });

      const now = currentTime;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Extend latestHour to at least the current hour + 1 to always show the red line
      latestHour = Math.max(latestHour, currentHour + 1);

      earliestHour = Math.max(0, earliestHour);
      latestHour = Math.min(24, latestHour);

      if (currentHour >= earliestHour && currentHour < latestHour) {
        const minutesSinceStart = (currentHour - earliestHour) * 60 + currentMinute;
        const position = minutesSinceStart * 1.0 + 8; // pixelsPerMinute = 1.0

        const containerHeight = scheduleContainerRef.current.clientHeight;
        const contentHeight = scheduleContainerRef.current.scrollHeight;

        // Calculate desired scroll position (centered on current time)
        let scrollPosition = Math.max(0, position - containerHeight / 2);

        // Check if centering on current time would show part of the last section
        const maxScroll = contentHeight - containerHeight;

        // If the centered position would show any content in the last 25% of the schedule,
        // scroll all the way to the bottom to show the last event fully
        const bottomThreshold = contentHeight * 0.75;
        if (scrollPosition + containerHeight >= bottomThreshold) {
          scrollPosition = maxScroll;
        }

        scheduleContainerRef.current.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }
    }
  }, [currentTime, isUserScrolling, data, showTomorrow]);

  // Handle user scroll
  const handleScroll = () => {
    setIsUserScrolling(true);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsUserScrolling(false);
    }, 10000); // Reset after 10 seconds of no scrolling
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-tertiary">Loading calendar...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xl text-tertiary">Error loading calendar</p>
      </div>
    );
  }

  const today = startOfDay(currentTime);
  const tomorrow = addDays(today, 1);

  // Get today's timed events
  const todayTimedEvents = data.events.filter(event => {
    const eventStart = parseISO(event.start);
    return isSameDay(eventStart, today) && !event.allDay;
  });

  // Get tomorrow's events - all day events + longest event per calendar
  const tomorrowEvents = data.events.filter(event => {
    // Handle both date strings (YYYY-MM-DD) and dateTime strings (ISO 8601)
    const eventStart = new Date(event.start);
    const isTomorrow = isSameDay(eventStart, tomorrow);
    return isTomorrow;
  });

  // Group tomorrow's events by calendar and get all-day + longest per calendar
  const tomorrowEventsToShow: CalendarEvent[] = [];
  const calendarGroups: { [key: number]: CalendarEvent[] } = {};

  tomorrowEvents.forEach(event => {
    // Add all all-day events
    if (event.allDay) {
      tomorrowEventsToShow.push(event);
    } else {
      // Group timed events by calendar
      const calIndex = event.calendarIndex ?? -1;
      if (!calendarGroups[calIndex]) {
        calendarGroups[calIndex] = [];
      }
      calendarGroups[calIndex].push(event);
    }
  });

  // Add longest event from each calendar
  Object.values(calendarGroups).forEach(calEvents => {
    if (calEvents.length > 0) {
      const longest = calEvents.reduce((prev, current) => {
        const prevDuration = differenceInMinutes(parseISO(prev.end), parseISO(prev.start));
        const currentDuration = differenceInMinutes(parseISO(current.end), parseISO(current.start));
        return currentDuration > prevDuration ? current : prev;
      });
      tomorrowEventsToShow.push(longest);
    }
  });

  // Sort tomorrow's events by start time
  tomorrowEventsToShow.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  // Get tomorrow's timed events for schedule view
  const tomorrowTimedEvents = tomorrowEvents.filter(event => !event.allDay);

  // Determine which events to show in schedule based on toggle
  const scheduleEvents = showTomorrow ? tomorrowTimedEvents : todayTimedEvents;

  let earliestHour = 9;
  let latestHour = 17;

  scheduleEvents.forEach(event => {
    const eventStart = parseISO(event.start);
    const eventEnd = parseISO(event.end);
    earliestHour = Math.min(earliestHour, eventStart.getHours());
    latestHour = Math.max(latestHour, eventEnd.getHours() + (eventEnd.getMinutes() > 0 ? 1 : 0));
  });

  // Extend latestHour to at least the current hour + 1 to always show the red line (only for today)
  if (!showTomorrow) {
    const currentHour = currentTime.getHours();
    latestHour = Math.max(latestHour, currentHour + 1);
  }

  earliestHour = Math.max(0, earliestHour);
  latestHour = Math.min(24, latestHour);
  const hours = Array.from({ length: latestHour - earliestHour }, (_, i) => i + earliestHour);

  const getEventsForSchedule = (): PositionedEvent[] => {
    const dayEvents = scheduleEvents;
    dayEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const positionedEvents: PositionedEvent[] = [];
    const columns: CalendarEvent[][] = [];

    dayEvents.forEach(event => {
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();

      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        const hasOverlap = column.some(existingEvent => {
          const existingStart = new Date(existingEvent.start).getTime();
          const existingEnd = new Date(existingEvent.end).getTime();
          if (eventEnd === existingStart || eventStart === existingEnd) return false;
          return eventStart < existingEnd && eventEnd > existingStart;
        });

        if (!hasOverlap) {
          column.push(event);
          placed = true;
          break;
        }
      }

      if (!placed) {
        columns.push([event]);
      }
    });

    dayEvents.forEach(event => {
      const columnIndex = columns.findIndex(col => col.includes(event));
      const eventStart = new Date(event.start).getTime();
      const eventEnd = new Date(event.end).getTime();

      let overlappingColumns = 0;
      columns.forEach(column => {
        const hasOverlappingEvent = column.some(otherEvent => {
          if (otherEvent.id === event.id) return false;
          const otherStart = new Date(otherEvent.start).getTime();
          const otherEnd = new Date(otherEvent.end).getTime();
          if (eventEnd === otherStart || eventStart === otherEnd) return false;
          return eventStart < otherEnd && eventEnd > otherStart;
        });
        if (hasOverlappingEvent) overlappingColumns++;
      });

      const totalColumns = overlappingColumns > 0 ? overlappingColumns + 1 : 1;

      positionedEvents.push({
        ...event,
        column: overlappingColumns > 0 ? columnIndex : 0,
        totalColumns: totalColumns,
      });
    });

    return positionedEvents;
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.calendarIndex !== undefined && event.calendarIndex < CALENDAR_COLORS.length) {
      return CALENDAR_COLORS[event.calendarIndex];
    }
    return DEFAULT_COLOR;
  };

  const pixelsPerMinute = 1.0;
  const hourHeight = 60 * pixelsPerMinute;

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Today's Schedule - should align bottom with Current Weather card */}
      <div className="card card-elevated p-6" style={{ height: '520px' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-5 ml-1">
          {showTomorrow ? "Tomorrow's Schedule" : "Today's Schedule"}
        </h3>
        <div
          ref={scheduleContainerRef}
          onScroll={handleScroll}
          className="relative h-full schedule-container"
          style={{ maxHeight: 'calc(100% - 32px)', overflowY: 'auto' }}
        >
          <div className="relative pr-2">
            {hours.length === 0 ? (
              <p className="text-sm text-tertiary">No events scheduled for today</p>
            ) : (
              hours.map((hour) => {
                const isCurrentHour = currentTime.getHours() === hour;
                return (
                  <div
                    key={hour}
                    className="relative flex items-start"
                    style={{ height: `${hourHeight}px` }}
                  >
                    <div className="w-16 text-right pr-4 pt-1 flex-shrink-0">
                      <span className="text-xs font-medium text-quaternary">
                        {format(new Date().setHours(hour, 0), 'h a')}
                      </span>
                    </div>

                    <div className="flex-1 relative">
                      <div
                        className="absolute top-2 w-full"
                        style={{
                          height: '1px',
                          background: 'var(--divider)',
                          opacity: 0.3
                        }}
                      />

                      {getEventsForSchedule().map((event) => {
                        const eventStart = parseISO(event.start);
                        const eventEnd = parseISO(event.end);
                        const eventHour = eventStart.getHours();

                        if (eventHour === hour) {
                          const startMinute = eventStart.getMinutes();
                          const duration = differenceInMinutes(eventEnd, eventStart);
                          const colors = getEventColor(event);

                          const top = startMinute * pixelsPerMinute;
                          const height = Math.max(duration * pixelsPerMinute - 2, 32);
                          const columnWidth = 100 / event.totalColumns;

                          return (
                            <div
                              key={event.id}
                              className="absolute rounded-lg overflow-hidden transition-smooth"
                              style={{
                                top: `${top}px`,
                                height: `${height}px`,
                                left: `${event.column * columnWidth}%`,
                                width: `${columnWidth - 1.5}%`,
                                backgroundColor: colors.bg,
                                borderLeft: `3px solid ${colors.border}`,
                                padding: '6px 10px',
                              }}
                            >
                              <div className="text-xs font-semibold text-primary truncate">
                                {event.title}
                              </div>
                              {height > 40 && (
                                <div className="text-xs text-tertiary mt-0.5">
                                  {format(eventStart, 'h:mm a')}
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Current Time Indicator - only show when viewing today */}
          {!showTomorrow && (() => {
            const now = currentTime;
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            if (currentHour >= earliestHour && currentHour < latestHour) {
              const minutesSinceStart = (currentHour - earliestHour) * 60 + currentMinute;
              const position = minutesSinceStart * pixelsPerMinute + 8;

              return (
                <div
                  className="absolute z-50 pointer-events-none flex items-center"
                  style={{
                    top: `${position}px`,
                    left: '4rem',
                    right: 0,
                  }}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent-red)' }}
                  />
                  <div
                    className="flex-1"
                    style={{
                      height: '2px',
                      backgroundColor: 'var(--accent-red)',
                      opacity: 0.7
                    }}
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      </div>

      {/* Tomorrow At A Glance - should align with forecast cards row */}
      <div
        className="card p-6 cursor-pointer transition-smooth hover:bg-opacity-80"
        style={{ height: '224px' }}
        onClick={handleTomorrowClick}
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-5 ml-1">
          Tomorrow At A Glance {showTomorrow && '(Viewing Above)'}
        </h3>
        <div className="grid grid-cols-2 gap-2.5" style={{ height: 'calc(100% - 32px)', overflowY: 'auto' }}>
          {tomorrowEventsToShow.length === 0 ? (
            <p className="text-sm text-tertiary col-span-2">No events scheduled for tomorrow</p>
          ) : (
            tomorrowEventsToShow.map((event) => {
              const colors = getEventColor(event);
              const eventDate = new Date(event.start);

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl transition-smooth"
                  style={{
                    backgroundColor: colors.bg,
                    borderLeft: `3px solid ${colors.border}`,
                  }}
                >
                  <div className="flex flex-col gap-1">
                    <div className="text-sm font-semibold text-primary truncate">
                      {event.title}
                    </div>
                    <div className="text-xs font-semibold" style={{ color: colors.text }}>
                      {event.allDay ? 'All Day' : format(eventDate, 'h:mm a')}
                    </div>
                    {event.location && (
                      <div className="text-xs text-tertiary truncate">
                        📍 {event.location}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
