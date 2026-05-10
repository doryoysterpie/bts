import React, { useRef, useState } from "react";
import { ArrowLeft, Star, Check, Lock, Sparkles, Loader2 } from "lucide-react";
import { MILESTONES_LIST, MARTY_PILLARS, MARTY_WISDOM } from "@/lib/constants";
import { fireMilestoneConfetti } from "@/lib/confetti";
import type { UserProfile, AppTab } from "@/hooks/useAppState";

interface MilestonesPageProps {
  profile: UserProfile;
  onMintMilestone: (days: number) => void;
  onNavigate: (tab: AppTab) => void;
  onChainMint: (days: number) => Promise<{ success: boolean; error?: string }>;
  walletConnected: boolean;
  chainLoading: boolean;
}

type CardState = "locked" | "achieved" | "minted";

const MilestonesPage: React.FC<MilestonesPageProps> = ({
  profile,
  onMintMilestone,
  onNavigate,
  onChainMint,
  walletConnected,
  chainLoading,
}) => {
  const pillarIdx = useRef(Math.floor(Math.random() * MARTY_PILLARS.length));
  const wisdomIdx = useRef(Math.floor(Math.random() * MARTY_WISDOM.length));
  const [mintingDays, setMintingDays] = useState<number | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const getCardState = (days: number): CardState => {
    if (profile.mintedMilestones.includes(days)) return "minted";
    if (profile.streakMax >= days) return "achieved";
    return "locked";
  };

  const handleMint = async (days: number) => {
    setTxError(null);
    setMintingDays(days);
    try {
      if (walletConnected) {
        const res = await onChainMint(days);
        if (!res.success) {
          if (res.error?.includes("AlreadyMinted") || res.error?.includes("already")) {
            // Already on-chain, just sync local
          } else {
            setTxError(res.error || "Transaction failed");
            setMintingDays(null);
            return;
          }
        }
      }
      onMintMilestone(days);
      fireMilestoneConfetti();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setTxError(msg.length > 80 ? msg.slice(0, 80) + "..." : msg);
    } finally {
      setMintingDays(null);
    }
  };

  const earnedCount = MILESTONES_LIST.filter((m) => profile.streakMax >= m.days).length;
  const mintedCount = profile.mintedMilestones.length;

  return (
    <div className="flex flex-col px-4 pt-4 pb-8 animate-fade-in">
      {/* Header */}
      <button
        onClick={() => onNavigate("home")}
        className="mb-4 flex items-center gap-1.5 text-sm text-ash transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6">
        <h2 className="font-serif text-xl font-semibold text-foreground">Milestones</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {earnedCount} earned &middot; {mintedCount} minted on-chain
        </p>
      </div>

      {txError && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          {txError}
        </div>
      )}

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {MILESTONES_LIST.map((milestone) => {
          const state = getCardState(milestone.days);

          return (
            <button
              key={milestone.days}
              onClick={() => state === "achieved" && handleMint(milestone.days)}
              disabled={state === "locked" || state === "minted" || mintingDays === milestone.days}
              className={`relative flex flex-col items-center rounded-2xl p-4 transition-all duration-200 ${
                state === "minted"
                  ? "bg-sage/15 border border-sage/30"
                  : state === "achieved"
                  ? "glass-card glow-border hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                  : "bg-muted/20 border border-border/50 opacity-50"
              }`}
            >
              {/* Icon */}
              <div
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                  state === "minted"
                    ? "bg-sage/20"
                    : state === "achieved"
                    ? "bg-teal/15"
                    : "bg-ink-lighter"
                }`}
              >
                {mintingDays === milestone.days ? (
                  <Loader2 className="h-5 w-5 text-teal animate-spin" />
                ) : state === "minted" ? (
                  <Check className="h-5 w-5 text-sage" />
                ) : state === "achieved" ? (
                  <Sparkles className="h-5 w-5 text-teal" />
                ) : (
                  <Lock className="h-4 w-4 text-ash" />
                )}
              </div>

              {/* Days */}
              <span
                className={`text-lg font-bold ${
                  state === "minted"
                    ? "text-sage"
                    : state === "achieved"
                    ? "text-foreground"
                    : "text-ash"
                }`}
              >
                {milestone.days}
              </span>

              {/* Label */}
              <span
                className={`text-[9px] text-center leading-tight mt-0.5 ${
                  state === "locked" ? "text-ash/60" : "text-muted-foreground"
                }`}
              >
                {milestone.label}
              </span>

              {/* Mint indicator */}
              {state === "achieved" && (
                <span className="mt-1.5 text-[8px] font-semibold text-teal uppercase tracking-wider">
                  Tap to mint
                </span>
              )}
              {state === "minted" && (
                <span className="mt-1.5 text-[8px] font-semibold text-sage uppercase tracking-wider">
                  On-chain
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress overview */}
      <div className="mb-6 rounded-xl glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-foreground">Progress</span>
          <span className="text-xs text-muted-foreground">
            {earnedCount}/{MILESTONES_LIST.length}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-lighter">
          <div
            className="h-full rounded-full bg-teal transition-all duration-700"
            style={{
              width: `${(earnedCount / MILESTONES_LIST.length) * 100}%`,
            }}
          />
        </div>

        {/* Tip jar sync note */}
        <p className="mt-2 text-[10px] text-muted-foreground">
          Milestones unlock proportional access to your Tip Jar.
          Current streak / all-time high = withdrawal %.
        </p>
      </div>

      {/* Milestone details */}
      <div className="space-y-2 mb-8">
        {MILESTONES_LIST.map((milestone) => {
          const state = getCardState(milestone.days);
          return (
            <div
              key={`detail-${milestone.days}`}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                state === "minted"
                  ? "bg-sage/10 border border-sage/20"
                  : state === "achieved"
                  ? "glass-card glow-border"
                  : "bg-muted/20"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0 ${
                  state === "minted"
                    ? "bg-sage/20 text-sage"
                    : state === "achieved"
                    ? "bg-teal/15 text-teal"
                    : "bg-ink-lighter text-ash"
                }`}
              >
                {state === "minted" ? (
                  <Check className="h-4 w-4" />
                ) : state === "achieved" ? (
                  <Star className="h-4 w-4" />
                ) : (
                  <span className="text-[10px]">{milestone.days}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${state === "locked" ? "text-ash" : "text-foreground"}`}>
                  {milestone.label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {milestone.description}
                </p>
              </div>
              {state === "minted" && (
                <span className="text-[9px] font-medium text-sage flex-shrink-0">Minted</span>
              )}
              {state === "achieved" && (
                <button
                  onClick={() => handleMint(milestone.days)}
                  disabled={mintingDays === milestone.days || chainLoading}
                  className="flex-shrink-0 rounded-lg bg-teal px-3 py-1.5 text-[10px] font-semibold text-background disabled:opacity-50"
                >
                  Mint
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Marty's Wisdom */}
      <div className="rounded-xl bg-muted/40 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ash mb-1.5">
          Marty&rsquo;s Wisdom
        </p>
        <p className="text-xs text-muted-foreground italic leading-relaxed mb-1">
          &ldquo;{MARTY_PILLARS[pillarIdx.current]}&rdquo;
        </p>
        <p className="text-[10px] text-ash">
          {MARTY_WISDOM[wisdomIdx.current]}
        </p>
      </div>
    </div>
  );
};

export default MilestonesPage;