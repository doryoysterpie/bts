import React from "react";
import { Flame, Star } from "lucide-react";
import { MILESTONES_LIST } from "@/lib/constants";
import type { AppTab } from "@/hooks/useAppState";

interface AppHeaderProps {
  streak: number;
  streakMax: number;
  onNavigate: (tab: AppTab) => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  streak,
  streakMax,
  onNavigate,
}) => {
  const nextMilestone = MILESTONES_LIST.find((m) => streakMax < m.days);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-app items-center justify-between px-4">
        {/* Left: Streak */}
        <button
          onClick={() => onNavigate("streak")}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 transition-colors hover:bg-ink-lighter"
        >
          <Flame className="h-4 w-4 text-teal" />
          <span className="text-sm font-bold text-foreground">{streak}</span>
        </button>

        {/* Center: Logo */}
        <button
          onClick={() => onNavigate("home")}
          className="font-serif text-xl font-bold tracking-tight transition-opacity hover:opacity-80"
        >
          <span className="text-foreground">bts</span>
        </button>

        {/* Right: Star — Milestones page */}
        <button
          onClick={() => onNavigate("milestones")}
          className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 transition-colors hover:bg-ink-lighter"
        >
          <Star className="h-4 w-4 text-sage" />
          <span className="text-xs font-semibold text-muted-foreground">
            {nextMilestone ? `${nextMilestone.days}d` : "Done"}
          </span>
        </button>
      </div>
    </header>
  );
};

export default AppHeader;