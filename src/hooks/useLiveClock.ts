import { useState, useEffect } from 'react';

export interface LiveClockState {
  time24: string; // "HH:MM:SS"
  formattedDate: string; // "20 September 2026"
  dayOfWeek: string; // "Sunday"
  isSunday: boolean;
  dateStr: string; // "YYYY-MM-DD"
}

export function useLiveClock(): LiveClockState {
  const [clock, setClock] = useState<LiveClockState>(() => getKolkataTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getKolkataTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return clock;
}

function getKolkataTime(): LiveClockState {
  const now = new Date();

  // Time in 24-hour format HH:MM:SS in Asia/Kolkata
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const time24 = timeFormatter.format(now);

  // Date in "20 September 2026" format
  const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedDate = dateFormatter.format(now);

  // Day of week
  const dayFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
  const dayOfWeek = dayFormatter.format(now);

  // ISO date string YYYY-MM-DD in Asia/Kolkata
  const isoFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = isoFormatter.format(now);

  const isSunday = dayOfWeek.toLowerCase() === 'sunday';

  return {
    time24,
    formattedDate,
    dayOfWeek,
    isSunday,
    dateStr,
  };
}
