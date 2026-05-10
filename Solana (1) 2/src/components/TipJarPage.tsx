import React, { useState } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Lock,
  Unlock,
  Wallet,
  Info,
  Loader2,
  Zap,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import type { OnChainProfile } from "@/lib/btsProgram";

interface TipJarPageProps {
  totalVaultLamports: number;
  streakCurrent: number;
  streakMax: number;
  unlockPercentage: number;
  onDeposit: (lamports: number) => void;
  onWithdraw: () => void;
  // On-chain hooks
  onChainProfile: OnChainProfile | null;
  onChainUnlock: number;
  onChainAddTip: (sol: number) => Promise<{ success: boolean; error?: string }>;
  onChainWithdraw: () => Promise<{ success: boolean; error?: string }>;
  chainLoading: boolean;
}

const LAMPORTS_PER_SOL = 1_000_000_000;

const QUICK_AMOUNTS = [
  { label: "Coffee", sol: 0.01, emoji: "☕" },
  { label: "Drink", sol: 0.05, emoji: "🍷" },
  { label: "Pack", sol: 0.1, emoji: "🚬" },
  { label: "Night Out", sol: 0.25, emoji: "🌃" },
];

const TipJarPage: React.FC<TipJarPageProps> = ({
  totalVaultLamports,
  streakCurrent,
  streakMax,
  unlockPercentage,
  onDeposit,
  onWithdraw,
  onChainProfile,
  onChainUnlock,
  onChainAddTip,
  onChainWithdraw,
  chainLoading,
}) => {
  const { connected } = useWallet();
  const [depositAmount, setDepositAmount] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Use on-chain data when available, fall back to local
  const isOnChain = connected && !!onChainProfile;
  const lockedTips = isOnChain ? onChainProfile.lockedTips : totalVaultLamports;
  const currentUnlock = isOnChain ? onChainUnlock : unlockPercentage;
  const isMilestoneWindow =
    isOnChain && onChainProfile.firstTimeMilestoneWindow;

  const solBalance = lockedTips / LAMPORTS_PER_SOL;
  const availableSol = (lockedTips * currentUnlock) / 100 / LAMPORTS_PER_SOL;

  const circumference = 2 * Math.PI * 52;
  const strokeDashoffset =
    circumference - (circumference * currentUnlock) / 100;

  const handleDeposit = async () => {
    const sol = parseFloat(depositAmount);
    if (isNaN(sol) || sol <= 0) return;
    setTxError(null);

    if (connected) {
      const res = await onChainAddTip(sol);
      if (!res.success) {
        setTxError(res.error || "Deposit failed");
        return;
      }
    }
    onDeposit(Math.floor(sol * LAMPORTS_PER_SOL));
    setDepositAmount("");
  };

  const handleQuickTip = async (sol: number) => {
    setTxError(null);
    if (connected) {
      const res = await onChainAddTip(sol);
      if (!res.success) {
        setTxError(res.error || "Deposit failed");
        return;
      }
    }
    onDeposit(Math.floor(sol * LAMPORTS_PER_SOL));
  };

  const handleWithdraw = async () => {
    setTxError(null);
    if (connected) {
      const res = await onChainWithdraw();
      if (!res.success) {
        setTxError(res.error || "Withdrawal failed");
        return;
      }
    }
    onWithdraw();
  };

  const needsWallet = !connected;

  return (
    <div className="flex flex-col px-4 pt-4 pb-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif text-xl font-semibold text-foreground">
            Tip Jar
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Lock the urge, reward the win
          </p>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="rounded-lg bg-muted p-2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <Info className="h-4 w-4" />
        </button>
      </div>

      {showInfo && (
        <div className="mb-4 rounded-xl bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground">
          <p className="font-semibold text-foreground mb-1">How It Works</p>
          <p>
            Would you buy a drink? A smoke? Put that money here instead. Your
            withdrawals unlock proportionally to your streak — reach your
            all-time high and get 100% back. Hit a brand new milestone? You get
            a 24-hour 100% withdrawal window.
          </p>
        </div>
      )}

      {/* Error */}
      {txError && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-2.5 text-xs text-destructive">
          {txError}
        </div>
      )}

      {/* Milestone window banner */}
      {isMilestoneWindow && (
        <div className="mb-4 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">
              100% Unlock Window Active
            </p>
            <p className="text-[10px] text-muted-foreground">
              New milestone reached — withdraw everything within 24h
            </p>
          </div>
        </div>
      )}

      {/* Balance display */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative">
          <svg width="128" height="128" className="-rotate-90">
            <circle
              cx="64"
              cy="64"
              r="52"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="64"
              cy="64"
              r="52"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground">
              {solBalance.toFixed(3)}
            </span>
            <span className="text-[10px] text-muted-foreground">SOL saved</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          {currentUnlock >= 100 ? (
            <Unlock className="h-3 w-3 text-primary" />
          ) : (
            <Lock className="h-3 w-3 text-muted-foreground" />
          )}
          <span>{currentUnlock}% unlockable</span>
          <span className="text-muted-foreground/70">
            ({availableSol.toFixed(4)} SOL)
          </span>
        </div>

        {isOnChain && (
          <p className="mt-1 text-[9px] text-primary/70">
            On-chain &middot; streak {onChainProfile.streakDays}d / best{" "}
            {onChainProfile.longestStreak}d
          </p>
        )}
      </div>

      {/* Connect wallet prompt */}
      {needsWallet && (
        <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl bg-primary/5 p-5 glow-border">
          <Wallet className="h-6 w-6 text-primary" />
          <p className="text-sm text-center text-muted-foreground">
            Connect your wallet to start tipping yourself instead of the urge.
          </p>
          <WalletMultiButton />
        </div>
      )}

      {/* Quick tip buttons */}
      <div className="mb-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Tip instead of...
        </p>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((qa) => (
            <button
              key={qa.label}
              onClick={() => handleQuickTip(qa.sol)}
              disabled={needsWallet || chainLoading}
              className="flex flex-col items-center gap-1 rounded-xl bg-muted py-3 text-foreground transition-all hover:bg-muted/80 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="text-base">{qa.emoji}</span>
              <span className="text-xs font-semibold">{qa.sol}</span>
              <span className="text-[9px] text-muted-foreground">
                {qa.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom deposit */}
      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="Custom amount (SOL)"
            disabled={needsWallet || chainLoading}
            className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-40"
          />
          <button
            onClick={handleDeposit}
            disabled={
              needsWallet ||
              chainLoading ||
              !depositAmount ||
              parseFloat(depositAmount) <= 0
            }
            className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
          >
            {chainLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowUpCircle className="h-4 w-4" />
            )}
            Tip
          </button>
        </div>
      </div>

      {/* Withdraw */}
      <button
        onClick={handleWithdraw}
        disabled={
          needsWallet || chainLoading || lockedTips === 0 || currentUnlock === 0
        }
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-muted/40 py-4 text-sm font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {chainLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
        ) : (
          <ArrowDownCircle className="h-4 w-4 text-accent" />
        )}
        Withdraw ({availableSol.toFixed(4)} SOL)
      </button>
    </div>
  );
};

export default TipJarPage;