"use client";

import { useEffect, useState } from "react";

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  if (diffWeek < 4) return `${diffWeek}w ago`;
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  return d.toLocaleDateString();
}

export function RelativeTime({ date, className }: { date: Date | string; className?: string }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(getRelativeTime(date));
    const interval = setInterval(() => setTime(getRelativeTime(date)), 60000);
    return () => clearInterval(interval);
  }, [date]);

  if (!time) return null;
  return <time className={className} dateTime={new Date(date).toISOString()} title={new Date(date).toLocaleString()}>{time}</time>;
}
