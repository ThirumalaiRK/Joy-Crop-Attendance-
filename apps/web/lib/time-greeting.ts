'use client';

import { useState, useEffect } from 'react';

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DynamicGreeting {
  greeting: string;
  salutation: string;
  icon: string;
  timePeriod: TimePeriod;
  timeString: string;
  tagline: string;
}

/**
 * Calculates dynamic time-based greeting using actual local/system time
 */
export function getDynamicGreeting(name?: string): DynamicGreeting {
  const now = new Date();
  const hour = now.getHours();

  let salutation = 'Good Morning';
  let icon = '🌅';
  let timePeriod: TimePeriod = 'morning';
  let tagline = 'Have a productive and amazing day ahead!';

  if (hour >= 4 && hour < 12) {
    salutation = 'Good Morning';
    icon = '🌅';
    timePeriod = 'morning';
    tagline = 'Start your day with energy & productivity!';
  } else if (hour >= 12 && hour < 17) {
    salutation = 'Good Afternoon';
    icon = '☀️';
    timePeriod = 'afternoon';
    tagline = 'Hope your afternoon is going smoothly!';
  } else if (hour >= 17 && hour < 21) {
    salutation = 'Good Evening';
    icon = '🌆';
    timePeriod = 'evening';
    tagline = 'Wrap up your daily tasks efficiently!';
  } else {
    salutation = 'Working Late / Good Night';
    icon = '🌙';
    timePeriod = 'night';
    tagline = 'Night Shift / Late Owl Ops Active!';
  }

  const greeting = name ? `${salutation}, ${name}` : salutation;
  const timeString = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    greeting,
    salutation,
    icon,
    timePeriod,
    timeString,
    tagline,
  };
}

/**
 * React Hook for automatic real-time dynamic time greeting that refreshes every 30 seconds
 */
export function useDynamicTimeGreeting(name?: string): DynamicGreeting {
  const [greetingData, setGreetingData] = useState<DynamicGreeting>(() => getDynamicGreeting(name));

  useEffect(() => {
    // Immediate calculation on mount
    setGreetingData(getDynamicGreeting(name));

    // Live ticker interval every 30 seconds
    const timer = setInterval(() => {
      setGreetingData(getDynamicGreeting(name));
    }, 30000);

    return () => clearInterval(timer);
  }, [name]);

  return greetingData;
}
