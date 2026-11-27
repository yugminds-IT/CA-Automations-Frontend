"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CalendarItem, dayKey, groupByDay, monthGrid } from "@/lib/calendar";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_PER_DAY = 3;

interface Props {
  anchor: Date;
  onAnchorChange: (next: Date) => void;
  items: CalendarItem[];
  loading?: boolean;
  /** Shown above the grid, e.g. when the month has more items than were loaded. */
  note?: string;
}

export function LeadCalendar({ anchor, onAnchorChange, items, loading, note }: Props) {
  const grid = useMemo(() => monthGrid(anchor), [anchor]);
  const byDay = useMemo(() => groupByDay(items), [items]);
  const todayKey = dayKey(new Date());
  const monthIndex = anchor.getMonth();

  const shift = (months: number) => onAnchorChange(new Date(anchor.getFullYear(), anchor.getMonth() + months, 1));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous month" onClick={() => shift(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next month" onClick={() => shift(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onAnchorChange(new Date())}>
            Today
          </Button>
        </div>
        <h2 className="text-lg font-semibold">
          {anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </h2>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Follow-up
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Task due
          </span>
        </div>
      </div>

      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border bg-border text-sm">
        {WEEKDAYS.map((d) => (
          <div key={d} className="bg-muted/50 px-2 py-1 text-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
        {grid.map((day) => {
          const key = dayKey(day);
          const dayItems = byDay.get(key) ?? [];
          const inMonth = day.getMonth() === monthIndex;
          const isToday = key === todayKey;
          return (
            <div
              key={key}
              className={`min-h-24 space-y-1 bg-background p-1.5 ${inMonth ? "" : "bg-muted/30 text-muted-foreground"}`}
            >
              <div className="flex justify-end">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                    isToday ? "bg-primary font-semibold text-primary-foreground" : ""
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>
              {dayItems.slice(0, MAX_PER_DAY).map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  title={item.title}
                  className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-xs hover:bg-muted"
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.kind === "follow_up" ? "bg-blue-500" : "bg-amber-500"}`}
                  />
                  <span className="truncate">{item.title}</span>
                </Link>
              ))}
              {dayItems.length > MAX_PER_DAY && (
                <p className="px-1 text-xs text-muted-foreground">+{dayItems.length - MAX_PER_DAY} more</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
