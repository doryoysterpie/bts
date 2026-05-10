import React, { useState, useRef } from "react";
import { Flame, Star } from "lucide-react";
import { DAILY_QUOTES, MILESTONES_LIST } from "@/lib/constants";
import type { UserProfile, AppTab } from "@/hooks/useAppState";

interface HomePageProps {
  profile: UserProfile;
  onNavigate: (tab: AppTab) => void;
  onStartGratitude: (text: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ profile, onNavigate, onStartGratitude }) => {
  const [quoteIndex] = useState(
    () => Math.floor(Math.random() * DAILY_QUOTES.length)
  );
  const quote = DAILY_QUOTES[quoteIndex];
  const [gratitudeDraft, setGratitudeDraft] = useState("");
  const hasNavigated = useRef(false);

  const nextMilestone = MILESTONES_LIST.find((m) => profile.streakMax < m.days);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const handleGratitudeFocus = () => {
    // Navigate on first interaction if empty
    if (!gratitudeDraft.trim() && !hasNavigated.current) {
      hasNavigated.current = true;
      onStartGratitude("");
    }
  };

  const handleGratitudeChange = (val: string) => {
    setGratitudeDraft(val);
    // Navigate once they start typing
    if (val.trim() && !hasNavigated.current) {
      hasNavigated.current = true;
      setTimeout(() => onStartGratitude(val), 150);
    }
  };

  return (
    <div className="flex flex-col px-4 pt-6 pb-8 animate-fade-in">
      {/* Greeting */}
      <p className="text-xs text-muted-foreground tracking-wide text-center mb-6">
        {greeting()}{profile.username ? `, ${profile.username}` : ""}
      </p>

      {/* Top row: Streaks — bts — Milestones */}
      <div className="flex items-end justify-between mb-10">
        {/* Streaks (left) */}
        <button
          onClick={() => onNavigate("streak")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-ink-lighter">
            <Flame className="h-5 w-5 text-teal" />
          </div>
          <span className="text-[10px] text-ash font-medium">{profile.streakCurrent}</span>
        </button>

        {/* bts (center) */}
        <div className="flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full glow-border bg-muted/60">
            <span className="font-serif text-2xl font-bold text-foreground">bts</span>
          </div>
        </div>

        {/* Milestone target (right) */}
        <button
          onClick={() => onNavigate("milestones")}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted transition-colors group-hover:bg-ink-lighter">
            <Star className="h-5 w-5 text-sage" />
          </div>
          <span className="text-[10px] text-ash font-medium">
            {nextMilestone ? `${nextMilestone.days}d` : "All"}
          </span>
        </button>
      </div>

      {/* Daily quote */}
      <div className="mb-8 rounded-2xl glass-card p-5 glow-border">
        <p className="font-serif text-base leading-relaxed text-foreground italic text-center">
          &ldquo;{quote.text}&rdquo;
        </p>
        <p className="mt-2.5 text-[10px] font-medium text-muted-foreground tracking-wide text-center">
          &mdash; {quote.author}
        </p>
      </div>

      {/* Gratitude prompt — navigates to Journal on interaction */}
      <div className="rounded-2xl glass-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-teal mb-3">
          What are three things you're grateful for today?
        </p>
        <textarea
          value={gratitudeDraft}
          onFocus={handleGratitudeFocus}
          onChange={(e) => handleGratitudeChange(e.target.value)}
          placeholder="Start typing to open your journal..."
          rows={2}
          className="w-full resize-none rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-ash/50 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20 transition-colors"
        />
      </div>
    </div>
  );
};

export default HomePage;