'use client';

import { useState, useEffect, useRef } from 'react';
import { format, addDays, parseISO, differenceInMinutes, isSameDay, startOfDay, isToday, isTomorrow } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

const TIMEZONE = 'America/Toronto'; // EST/EDT

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
  // Use EST timezone for all date operations
  const [currentTime, setCurrentTime] = useState(() => toZonedTime(new Date(), TIMEZONE));
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleContainerRef = useRef<HTMLDivElement | null>(null);
  const tomorrowTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savedTodayScrollPosition = useRef<number>(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(toZonedTime(new Date(), TIMEZONE)), 60000);
    return () => clearInterval(timer);
  }, []);

  // Handle toggle between today and tomorrow
  const handleTomorrowClick = () => {
    const newShowTomorrow = !showTomorrow;
    setShowTomorrow(newShowTomorrow);

    // Clear existing timeout
    if (tomorrowTimeoutRef.current) {
      clearTimeout(tomorrowTimeoutRef.current);
    }

    // If switching to tomorrow view, set timeout to revert back
    if (newShowTomorrow) {
      // Save current scroll position for today
      if (scheduleContainerRef.current) {
        savedTodayScrollPosition.current = scheduleContainerRef.current.scrollTop;
      }

      tomorrowTimeoutRef.current = setTimeout(() => {
        setShowTomorrow(false);
      }, 30000); // Revert after 30 seconds

      // Scroll to first event of tomorrow
      setTimeout(() => {
        if (scheduleContainerRef.current && data) {
          const tomorrowDay = addDays(startOfDay(currentTime), 1);
          const tomorrowDateStr = format(tomorrowDay, 'yyyy-MM-dd');

          const tomorrowTimedEvts = data.events.filter(event => {
            if (event.allDay) return false;
            const eventStart = parseISO(event.start);
            return isSameDay(eventStart, tomorrowDay);
          });

          if (tomorrowTimedEvts.length > 0) {
            // Find the earliest event
            const firstEvent = tomorrowTimedEvts.reduce((earliest, event) => {
              return new Date(event.start).getTime() < new Date(earliest.start).getTime() ? event : earliest;
            });

            const eventStart = parseISO(firstEvent.start);
            const eventHour = eventStart.getHours();
            const eventMinute = eventStart.getMinutes();
            const minutesSinceMidnight = eventHour * 60 + eventMinute;
            const position = minutesSinceMidnight * 1.0; // pixelsPerMinute = 1.0

            // Scroll to show first event with some padding above
            // Account for top padding in the schedule container
            const scrollPosition = Math.max(0, position - 60);

            scheduleContainerRef.current.scrollTo({
              top: scrollPosition,
              behavior: 'smooth'
            });
          } else {
            // No events tomorrow, scroll to top
            scheduleContainerRef.current.scrollTo({
              top: 0,
              behavior: 'smooth'
            });
          }
        }
      }, 100); // Small delay to ensure state has updated
    } else {
      // Switching back to today - restore saved scroll position
      setTimeout(() => {
        if (scheduleContainerRef.current) {
          scheduleContainerRef.current.scrollTo({
            top: savedTodayScrollPosition.current,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  // Auto-scroll to intelligently frame current and upcoming events
  useEffect(() => {
    if (!showTomorrow && !isUserScrolling && scheduleContainerRef.current && data) {
      const today = startOfDay(currentTime);

      // Get today's timed events
      const todayEvents = data.events.filter(event => {
        const eventStart = parseISO(event.start);
        return isSameDay(eventStart, today) && !event.allDay;
      });

      if (todayEvents.length === 0) return;

      const now = currentTime;
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      // Calculate current time position (pixelsPerMinute = 1.0)
      const minutesSinceMidnight = currentHour * 60 + currentMinute;
      const currentTimePosition = minutesSinceMidnight * 1.0;

      const containerHeight = scheduleContainerRef.current.clientHeight;
      const contentHeight = scheduleContainerRef.current.scrollHeight;

      // Find upcoming events (not yet finished)
      const currentTimeMs = now.getTime();
      const upcomingEvents = todayEvents.filter(event => {
        const eventEnd = parseISO(event.end);
        return eventEnd.getTime() > currentTimeMs;
      });

      let scrollPosition: number;

      if (upcomingEvents.length === 0) {
        // EVENING CASE: No more events today
        // Keep red line centered and let it scroll through rest of day
        scrollPosition = Math.max(0, currentTimePosition - containerHeight / 2);
        scrollPosition = Math.min(scrollPosition, contentHeight - containerHeight);
      } else {
        // ACTIVE DAY CASE: Have upcoming events
        // Goal: Maximize visibility of current time + upcoming events

        const firstUpcomingEvent = upcomingEvents[0];
        const firstEventStart = parseISO(firstUpcomingEvent.start);
        const firstEventMinutes = firstEventStart.getHours() * 60 + firstEventStart.getMinutes();
        const firstEventPosition = firstEventMinutes * 1.0;

        const lastUpcomingEvent = upcomingEvents[upcomingEvents.length - 1];
        const lastEventEnd = parseISO(lastUpcomingEvent.end);
        const lastEventMinutes = lastEventEnd.getHours() * 60 + lastEventEnd.getMinutes();
        const lastEventPosition = lastEventMinutes * 1.0;

        // Strategy: Start from 2 hours before first event (to avoid empty morning hours)
        const earliestDesiredPosition = Math.max(0, firstEventPosition - 120);

        // Calculate where centering on current time would scroll to
        const centeredPosition = Math.max(0, currentTimePosition - containerHeight / 2);

        // Use the later of: 2hrs before first event OR centered on current time
        // This prevents showing empty hours while keeping current time visible
        scrollPosition = Math.max(earliestDesiredPosition, centeredPosition);

        // Ensure last upcoming event is visible
        const visibleBottom = scrollPosition + containerHeight;
        if (lastEventPosition > visibleBottom) {
          // Adjust to show the last event with padding
          scrollPosition = Math.max(0, lastEventPosition - containerHeight + 60);
        }

        // Ensure current time line stays visible (at least 100px from bottom)
        const maxScrollToKeepRedLineVisible = currentTimePosition - 100;
        scrollPosition = Math.min(scrollPosition, maxScrollToKeepRedLineVisible);
      }

      scheduleContainerRef.current.scrollTo({
        top: scrollPosition,
        behavior: 'smooth'
      });
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

  // Helper function to check if event matches a given day
  const isEventOnDay = (event: CalendarEvent, targetDay: Date): boolean => {
    if (event.allDay) {
      // For all-day events, compare date strings (YYYY-MM-DD format)
      const targetDateStr = format(targetDay, 'yyyy-MM-dd');
      return event.start === targetDateStr;
    } else {
      // For timed events, use normal date comparison
      const eventStart = parseISO(event.start);
      return isSameDay(eventStart, targetDay);
    }
  };

  // Get today's events
  const todayTimedEvents = data.events.filter(event => {
    return isEventOnDay(event, today) && !event.allDay;
  });

  const todayAllDayEvents = data.events
    .filter(event => {
      return isEventOnDay(event, today) && event.allDay;
    })
    .sort((a, b) => {
      // Sort by calendarIndex descending (higher index = iCal events, shown first)
      return (b.calendarIndex ?? 0) - (a.calendarIndex ?? 0);
    });

  // Get tomorrow's events - all day events + longest event per calendar
  const tomorrowEvents = data.events.filter(event => {
    return isEventOnDay(event, tomorrow);
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
  const tomorrowAllDayEvents = tomorrowEvents
    .filter(event => event.allDay)
    .sort((a, b) => {
      // Sort by calendarIndex descending (higher index = iCal events, shown first)
      return (b.calendarIndex ?? 0) - (a.calendarIndex ?? 0);
    });

  // Determine which events to show in schedule based on toggle
  const scheduleEvents = showTomorrow ? tomorrowTimedEvents : todayTimedEvents;
  const allDayEvents = showTomorrow ? tomorrowAllDayEvents : todayAllDayEvents;

  // Always show full 24-hour day (12am to 11:59pm)
  const earliestHour = 0;
  const latestHour = 24;
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
  const SCHEDULE_TOP_PADDING = 8; // pt-2 in pixels

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Today's Schedule - should align bottom with Current Weather card */}
      <div className="card card-elevated p-6 flex flex-col" style={{ height: '520px' }}>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary mb-5 ml-1">
          {showTomorrow ? "Tomorrow's Schedule" : "Today's Schedule"}
        </h3>

        {/* All-Day Events - Fixed Header */}
        {allDayEvents.length > 0 && (
          <div className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${Math.min(allDayEvents.length, 3)}, 1fr)` }}
            >
              {allDayEvents.slice(0, 3).map((event) => {
                const colors = getEventColor(event);
                return (
                  <div
                    key={event.id}
                    className="rounded-md px-2.5 py-1.5 flex items-center gap-2"
                    style={{
                      backgroundColor: colors.bg,
                      borderLeft: `3px solid ${colors.border}`,
                    }}
                  >
                    <div className="text-xs font-semibold text-primary truncate flex-1">
                      {event.title}
                    </div>
                    <div className="text-xs font-medium whitespace-nowrap" style={{ color: colors.text }}>
                      All Day
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div
          ref={scheduleContainerRef}
          onScroll={handleScroll}
          className="relative flex-1 schedule-container"
          style={{ overflowY: 'auto' }}
        >
          <div className="relative pr-2 pt-2">
            {hours.map((hour) => {
                const isCurrentHour = currentTime.getHours() === hour;
                return (
                  <div
                    key={hour}
                    className="relative flex items-start"
                    style={{ height: `${hourHeight}px` }}
                  >
                    <div className="w-16 text-right pr-4 flex-shrink-0 flex items-center" style={{ height: '1px', transform: 'translateY(0)' }}>
                      <span className="text-xs font-medium text-quaternary">
                        {format(new Date().setHours(hour, 0), 'h a')}
                      </span>
                    </div>

                    <div className="flex-1 relative">
                      <div
                        className="absolute top-0 w-full"
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
                          const height = Math.max(duration * pixelsPerMinute, 32);
                          const columnWidth = 100 / event.totalColumns;
                          const isShortEvent = duration <= 30;

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
                              {isShortEvent ? (
                                <div className="flex items-center gap-2">
                                  <div className="text-xs font-semibold text-primary truncate flex-1">
                                    {event.title}
                                  </div>
                                  <div className="text-xs font-semibold whitespace-nowrap" style={{ color: colors.text }}>
                                    {format(eventStart, 'h:mm a')}
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1">
                                  <div className="text-xs font-semibold text-primary truncate">
                                    {event.title}
                                  </div>
                                  <div className="text-xs font-semibold" style={{ color: colors.text }}>
                                    {format(eventStart, 'h:mm a')}
                                  </div>
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
              })}

            {/* Final 12 AM marker at end of day */}
            <div className="relative flex items-start" style={{ height: '1px' }}>
              <div className="w-16 text-right pr-4 flex-shrink-0 flex items-center" style={{ height: '1px', transform: 'translateY(0)' }}>
                <span className="text-xs font-medium text-quaternary">
                  12 AM
                </span>
              </div>
              <div className="flex-1 relative">
                <div
                  className="absolute top-0 w-full"
                  style={{
                    height: '1px',
                    background: 'var(--divider)',
                    opacity: 0.3
                  }}
                />
              </div>
            </div>
          </div>

          {/* Current Time Indicator - only show when viewing today */}
          {!showTomorrow && (() => {
            const now = currentTime;
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            // Calculate position from midnight (hour 0)
            const minutesSinceMidnight = currentHour * 60 + currentMinute;
            const position = minutesSinceMidnight * pixelsPerMinute + SCHEDULE_TOP_PADDING;

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
        <div className="grid grid-cols-2 gap-2.5 content-start" style={{ height: 'calc(100% - 32px)', overflowY: 'auto' }}>
          {tomorrowEventsToShow.length === 0 ? (
            <p className="text-sm text-tertiary col-span-2">No events scheduled for tomorrow</p>
          ) : (
            tomorrowEventsToShow.map((event) => {
              const colors = getEventColor(event);
              const eventDate = new Date(event.start);

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl transition-smooth h-fit"
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
