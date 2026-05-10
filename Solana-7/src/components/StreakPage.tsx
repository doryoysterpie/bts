import React, { useState, useCallback, useRef } from "react";
import {
  Flame,
  Trophy,
  Sparkles,
  Camera,
  RefreshCw,
  GraduationCap,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import {
  PET_SPECIES,
  JOURNAL_SCHOLAR_THRESHOLD,
  MARTY_PILLARS,
  MARTY_WISDOM,
} from "@/lib/constants";
import { firePetMintConfetti } from "@/lib/confetti";
import type { UserProfile, AppTab } from "@/hooks/useAppState";

interface StreakPageProps {
  profile: UserProfile;
  onMintPet: () => number;
  onRegeneratePet: () => number;
  onNavigate: (tab: AppTab) => void;
  onChainMintPet: () => Promise<{ success: boolean; error?: string }>;
  onChainRegeneratePet: () => Promise<{ success: boolean; error?: string }>;
  chainLoading: boolean;
  walletConnected: boolean;
}

const StreakPage: React.FC<StreakPageProps> = ({
  profile,
  onMintPet,
  onRegeneratePet,
  onNavigate,
  onChainMintPet,
  onChainRegeneratePet,
  chainLoading,
  walletConnected,
}) => {
  const [isWiggling, setIsWiggling] = useState(false);
  const [justMinted, setJustMinted] = useState(false);
  const [heartParticles, setHeartParticles] = useState<number[]>([]);
  const [txError, setTxError] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const martyIdx = useRef(Math.floor(Math.random() * MARTY_WISDOM.length));
  const pillarIdx = useRef(Math.floor(Math.random() * MARTY_PILLARS.length));

  const pet =
    profile.petType > 0
      ? PET_SPECIES.find((p) => p.id === profile.petType)
      : null;
  const hasScholarSkin = profile.journalCount >= JOURNAL_SCHOLAR_THRESHOLD;

  const petScale = Math.min(1 + profile.streakCurrent * 0.008, 1.6);
  const glowIntensity = Math.min(profile.streakCurrent * 2, 40);

  const handleTickle = useCallback(() => {
    if (!profile.petAlive || !pet) return;
    setIsWiggling(true);
    const newHearts = [...Array(4)].map(() => Math.random());
    setHeartParticles(newHearts);
    setTimeout(() => {
      setIsWiggling(false);
      setHeartParticles([]);
    }, 600);
  }, [profile.petAlive, pet]);

  const handleMint = async () => {
    setTxError(null);
    setMinting(true);

    try {
      if (walletConnected) {
        const res = await onChainMintPet();
        if (!res.success) {
          // If already exists on-chain, just sync local
          if (
            res.error?.includes("PetAlreadyExists") ||
            res.error?.includes("already")
          ) {
            onMintPet();
          } else {
            setTxError(res.error || "Transaction failed");
            setMinting(false);
            return;
          }
        }
      }
      onMintPet();
      setJustMinted(true);
      firePetMintConfetti();
      setTimeout(() => setJustMinted(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setTxError(msg.length > 80 ? msg.slice(0, 80) + "..." : msg);
    } finally {
      setMinting(false);
    }
  };

  const handleRegenerate = async () => {
    setTxError(null);
    setMinting(true);

    try {
      if (walletConnected) {
        const res = await onChainRegeneratePet();
        if (!res.success) {
          if (
            res.error?.includes("PetStillAlive") ||
            res.error?.includes("alive")
          ) {
            setTxError("Pet is still alive.");
            setMinting(false);
            return;
          }
          setTxError(res.error || "Transaction failed");
          setMinting(false);
          return;
        }
      }
      onRegeneratePet();
      setJustMinted(true);
      firePetMintConfetti();
      setTimeout(() => setJustMinted(false), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setTxError(msg.length > 80 ? msg.slice(0, 80) + "..." : msg);
    } finally {
      setMinting(false);
    }
  };

  const handleSelfie = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "bts.her",
          text: `Day ${profile.streakCurrent} with my companion on bts.her. Keeping the flame alive!`,
          url: window.location.href,
        })
        .catch(() => {});
    }
  };

  const isBusy = minting || chainLoading;

  return (
    <div className="flex flex-col px-4 pt-4 pb-8 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => onNavigate("home")}
        className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Streak display */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10 glow-border">
            <div className="text-center">
              <Flame className="mx-auto h-8 w-8 text-primary mb-1" />
              <span className="text-3xl font-bold text-foreground">
                {profile.streakCurrent}
              </span>
            </div>
          </div>
        </div>

        <h2 className="font-serif text-xl font-semibold text-foreground">
          {profile.streakCurrent === 0
            ? "Start Your Journey"
            : profile.streakCurrent === 1
            ? "Day One \u2014 The Bravest Step"
            : `${profile.streakCurrent} Days Strong`}
        </h2>

        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs text-muted-foreground">
              Best: {profile.streakMax}
            </span>
          </div>
        </div>
      </div>

      {/* Error */}
      {txError && (
        <div className="mx-0 mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          {txError}
        </div>
      )}

      {/* Virtual Pet Section */}
      <div className="rounded-2xl glass-card p-6 text-center mb-6">
        {profile.petType === 0 ? (
          <>
            <div className="mb-5 relative">
              <div
                className="mx-auto flex h-24 w-24 items-center justify-center rounded-full animate-pulse-soft"
                style={{
                  background:
                    "radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)",
                }}
              >
                <span className="text-5xl">&#x1F95A;</span>
              </div>
            </div>

            <h3 className="font-serif text-lg font-semibold text-foreground mb-2">
              A Surprise Awaits
            </h3>
            <p className="text-xs text-muted-foreground mb-5 max-w-[260px] mx-auto">
              Mint your companion. You never know what species you&rsquo;ll get
              &mdash; like a Neopet for your soul.
            </p>

            <button
              onClick={handleMint}
              disabled={isBusy}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isBusy ? "Minting..." : "Mint Your Companion"}
            </button>
          </>
        ) : (
          <>
            {/* Pet with scaling */}
            <div className="relative inline-block mb-4">
              <button
                onClick={handleTickle}
                className={`relative transition-transform duration-200 ${
                  profile.petAlive
                    ? isWiggling
                      ? "animate-wiggle"
                      : "animate-float"
                    : "animate-ghost"
                } ${justMinted ? "scale-125" : ""}`}
                style={{
                  fontSize: `${3.5 * petScale}rem`,
                  filter: profile.petAlive
                    ? `drop-shadow(0 0 ${glowIntensity}px hsl(var(--primary) / 0.3))`
                    : "grayscale(0.6) blur(0.5px)",
                  opacity: profile.petAlive ? 1 : 0.3,
                }}
                title={profile.petAlive ? "Tap to tickle!" : "Ghost pet..."}
              >
                {pet?.emoji || "\uD83D\uDC7B"}
              </button>

              {/* Scholar hat */}
              {hasScholarSkin && profile.petAlive && (
                <div className="absolute -top-4 -right-4">
                  <GraduationCap className="h-7 w-7 text-accent" />
                </div>
              )}

              {/* Heart particles on tickle */}
              {heartParticles.map((r, i) => (
                <span
                  key={i}
                  className="absolute text-lg pointer-events-none"
                  style={{
                    left: `${30 + r * 40}%`,
                    top: `${10 + i * 15}%`,
                    animation: "float 0.6s ease-out forwards",
                    opacity: 0.8,
                  }}
                >
                  &#x1F49A;
                </span>
              ))}
            </div>

            {/* Pet info */}
            <h3 className="font-serif text-lg font-semibold text-foreground">
              {profile.petAlive ? pet?.name : `Ghost of ${pet?.name}`}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-1">
              {profile.petAlive
                ? hasScholarSkin
                  ? "Scholar Edition \u2014 50+ journal entries (Yale/Rutgers)"
                  : pet?.description
                : "Lost to a broken streak..."}
            </p>

            {!profile.petAlive && (
              <p className="text-xs text-muted-foreground/60 mb-4 italic">
                Rest in peace.
              </p>
            )}

            {/* Actions */}
            <div className="mt-4 flex items-center justify-center gap-3">
              {profile.petAlive ? (
                <>
                  <button
                    onClick={handleTickle}
                    className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Tickle
                  </button>
                  <button
                    onClick={handleSelfie}
                    className="flex items-center gap-1.5 rounded-xl bg-muted px-4 py-2.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/80"
                  >
                    <Camera className="h-3.5 w-3.5 text-accent" />
                    Selfie
                  </button>
                </>
              ) : (
                <button
                  onClick={handleRegenerate}
                  disabled={isBusy}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isBusy ? "Regenerating..." : "Regenerate"}
                </button>
              )}
            </div>

            {/* Scholar skin progress */}
            {profile.petAlive && !hasScholarSkin && (
              <div className="mt-5 rounded-xl bg-muted/60 p-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
                  <span>Scholar Skin</span>
                  <span>
                    {profile.journalCount}/{JOURNAL_SCHOLAR_THRESHOLD}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        (profile.journalCount / JOURNAL_SCHOLAR_THRESHOLD) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Marty's Wisdom */}
      <div className="rounded-xl bg-muted/40 p-4 mb-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
          Marty&rsquo;s Wisdom
        </p>
        <p className="text-xs text-muted-foreground italic leading-relaxed mb-1">
          &ldquo;{MARTY_PILLARS[pillarIdx.current]}&rdquo;
        </p>
        <p className="text-[10px] text-muted-foreground/70">
          {MARTY_WISDOM[martyIdx.current]}
        </p>
      </div>
    </div>
  );
};

export default StreakPage;
