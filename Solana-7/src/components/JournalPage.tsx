import React, { useState, useRef, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Shield, X } from "lucide-react";
import type { JournalEntry } from "@/hooks/useAppState";

interface JournalPageProps {
  journals: JournalEntry[];
  isPremium: boolean;
  isSubscriber: boolean;
  initialGratitude?: string;
  onAddJournal: (entry: Omit<JournalEntry, "id" | "timestamp">) => void;
  onCheckInComplete: () => void;
}

/* ---------- tiny calendar helpers ---------- */
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function daysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}
function sameDay(a: string, b: string) {
  return a === b;
}

/* ========================================== */

const JournalPage: React.FC<JournalPageProps> = ({
  journals,
  isPremium,
  isSubscriber,
  initialGratitude = "",
  onAddJournal,
  onCheckInComplete,
}) => {
  const now = new Date();
  const todayKey = dateKey(now);

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const calRef = useRef<HTMLDivElement>(null);

  // Form state
  const [gratitude, setGratitude] = useState<[string, string, string]>([initialGratitude, "", ""]);
  const [twoPeople, setTwoPeople] = useState<[string, string]>(["", ""]);
  const [oneMoment, setOneMoment] = useState("");

  // Click-outside to close calendar
  useEffect(() => {
    if (!calendarOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) {
        setCalendarOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [calendarOpen]);

  // Dates that have journal entries (for dot indicator)
  const entryDates = useMemo(
    () => new Set(journals.map((j) => j.date)),
    [journals]
  );

  // Selected day's entry (if any)
  const selectedEntry = journals.find((j) => j.date === selectedDate);
  const isToday = sameDay(selectedDate, todayKey);
  const canViewPast = isPremium || isSubscriber;

  // Calendar grid
  const firstDow = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const calendarCells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const handleDayClick = (day: number) => {
    const d = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(d);
    setCalendarOpen(false);
  };

  // Format selected date for display
  const selectedDateObj = new Date(selectedDate + "T12:00:00");
  const displayDate = selectedDateObj.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const canSubmit = gratitude.some((g) => g.trim()) && oneMoment.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    onAddJournal({ date: todayKey, gratitude, twoPeople, oneMoment });
    setGratitude(["", "", ""]);
    setTwoPeople(["", ""]);
    setOneMoment("");
    onCheckInComplete();
  };

  // ---- Read-only view for past entries ----
  const renderPastEntry = (entry: JournalEntry) => (
    <div className="mt-4 space-y-3 animate-fade-in">
      {entry.gratitude.filter((g) => g.trim()).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-teal mb-1.5">
            3 &mdash; Grateful for
          </p>
          {entry.gratitude.filter((g) => g.trim()).map((g, i) => (
            <p key={i} className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-teal/30 mb-1.5">
              {g}
            </p>
          ))}
        </div>
      )}
      {entry.twoPeople?.filter((p) => p.trim()).length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sage mb-1.5">
            2 &mdash; People who made it better
          </p>
          {entry.twoPeople.filter((p) => p.trim()).map((p, i) => (
            <p key={i} className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-sage/30 mb-1.5">
              {p}
            </p>
          ))}
        </div>
      )}
      {entry.oneMoment && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-beige-pearl mb-1.5">
            1 &mdash; Moment that made me smile
          </p>
          <p className="text-sm text-foreground leading-relaxed pl-3 border-l-2 border-beige-pearl/30">
            {entry.oneMoment}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col px-4 pt-4 pb-8 animate-fade-in">
      {/* Date header — click to open calendar */}
      <div className="relative mb-1" ref={calRef}>
        <button
          onClick={() => setCalendarOpen((o) => !o)}
          className="flex items-center gap-2 group"
        >
          <h2 className="font-serif text-xl font-semibold text-foreground group-hover:text-teal transition-colors">
            {displayDate}
          </h2>
          <ChevronLeft
            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
              calendarOpen ? "rotate-90" : "-rotate-90"
            }`}
          />
        </button>

        {/* Calendar dropdown */}
        {calendarOpen && (
          <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl glass-card border border-border p-4 shadow-lg animate-fade-in">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="rounded-lg p-1.5 text-ash hover:text-foreground hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="rounded-lg p-1.5 text-ash hover:text-foreground hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((d) => (
                <div key={d} className="text-center text-[9px] font-medium text-ash py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {calendarCells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const cellKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEntry = entryDates.has(cellKey);
                const isSelected = sameDay(cellKey, selectedDate);
                const isCellToday = sameDay(cellKey, todayKey);
                const isFuture = cellKey > todayKey;

                return (
                  <button
                    key={cellKey}
                    disabled={isFuture}
                    onClick={() => handleDayClick(day)}
                    className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-colors ${
                      isSelected
                        ? "bg-teal text-background font-bold"
                        : isCellToday
                        ? "bg-teal/15 text-teal font-semibold"
                        : isFuture
                        ? "text-ash/30 cursor-default"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {day}
                    {hasEntry && !isSelected && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-teal" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Close */}
            <button
              onClick={() => setCalendarOpen(false)}
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-muted py-2 text-xs text-ash hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Close
            </button>
          </div>
        )}
      </div>

      {/* Privacy badge */}
      <div className="mb-5 flex items-center gap-1.5">
        <Shield className="h-3 w-3 text-ash" />
        <p className="text-[10px] text-ash">
          Private &mdash; never on-chain. Marty cannot read these.
        </p>
      </div>

      {/* ----- Viewing a past date ----- */}
      {!isToday && (
        <>
          {selectedEntry ? (
            canViewPast ? (
              renderPastEntry(selectedEntry)
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Past entries require a subscription
                </p>
                <p className="text-xs text-ash">
                  Switch to today to write a new entry.
                </p>
                <button
                  onClick={() => { setSelectedDate(todayKey); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}
                  className="mt-4 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-background"
                >
                  Go to Today
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No entry for this day.</p>
              <button
                onClick={() => { setSelectedDate(todayKey); setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); }}
                className="mt-4 rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-background"
              >
                Go to Today
              </button>
            </div>
          )}
        </>
      )}

      {/* ----- Today's form ----- */}
      {isToday && (
        <>
          {/* If already submitted today, show read-only */}
          {selectedEntry ? (
            <div>
              <div className="mb-3 rounded-xl bg-sage/10 px-4 py-3 text-center">
                <p className="text-sm font-medium text-sage">
                  You showed up today. That matters.
                </p>
              </div>
              {renderPastEntry(selectedEntry)}
            </div>
          ) : (
            <>
              {/* 3: Grateful for */}
              <section className="mb-5">
                <label className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal/15 text-[10px] font-bold text-teal">3</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-teal">
                    Things you are grateful for
                  </span>
                </label>
                {gratitude.map((val, i) => (
                  <input
                    key={i}
                    value={val}
                    onChange={(e) => {
                      const next = [...gratitude] as [string, string, string];
                      next[i] = e.target.value;
                      setGratitude(next);
                    }}
                    placeholder={
                      i === 0 ? "I'm grateful for..." : i === 1 ? "I'm thankful that..." : "I appreciate..."
                    }
                    className="mb-2 w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-ash/50 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20 transition-colors"
                  />
                ))}
              </section>

              {/* 2: People */}
              <section className="mb-5">
                <label className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sage/15 text-[10px] font-bold text-sage">2</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-sage">
                    People who made your day better
                  </span>
                </label>
                {twoPeople.map((val, i) => (
                  <input
                    key={i}
                    value={val}
                    onChange={(e) => {
                      const next = [...twoPeople] as [string, string];
                      next[i] = e.target.value;
                      setTwoPeople(next);
                    }}
                    placeholder={
                      i === 0 ? "Someone who showed up for me..." : "Someone I'm glad to know..."
                    }
                    className="mb-2 w-full rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-ash/50 focus:border-sage/40 focus:outline-none focus:ring-1 focus:ring-sage/20 transition-colors"
                  />
                ))}
              </section>

              {/* 1: Moment */}
              <section className="mb-8">
                <label className="mb-2 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-beige/15 text-[10px] font-bold text-beige-pearl">1</span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-beige-pearl">
                    Moment that made you smile
                  </span>
                </label>
                <textarea
                  value={oneMoment}
                  onChange={(e) => setOneMoment(e.target.value)}
                  placeholder="A small moment that brought light to my day..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-ash/50 focus:border-beige-pearl/40 focus:outline-none focus:ring-1 focus:ring-beige/20 transition-colors"
                />
              </section>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex items-center justify-center gap-2 rounded-2xl bg-teal py-4 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Complete Check-In
              </button>

              <p className="mt-2 text-[10px] text-ash/40 text-center">
                Entries are saved to your device only
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default JournalPage;