import React, { useState, useRef, useEffect } from "react";
import {
  Flame,
  Trophy,
  BookOpen,
  Star,
  Camera,
  ChevronRight,
  Eye,
  EyeOff,
  Crown,
  Shield,
  Settings,
  Loader2,
  Check,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { LogOut } from "lucide-react";
import { MILESTONES_LIST, MARTY_WISDOM } from "@/lib/constants";
import type { UserProfile, AppTab } from "@/hooks/useAppState";

interface ProfilePageProps {
  profile: UserProfile;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onNavigate: (tab: AppTab) => void;
  onInitializeConfig: () => Promise<{ success: boolean; error?: string }>;
  isConfigInitialized: () => Promise<boolean>;
  walletConnected: boolean;
  chainLoading: boolean;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  profile,
  onUpdateProfile,
  onNavigate,
  onInitializeConfig,
  isConfigInitialized,
  walletConnected,
  chainLoading,
}) => {
  const { publicKey, disconnect, connected } = useWallet();
  const [showHiddenDetails, setShowHiddenDetails] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [goalInput, setGoalInput] = useState(profile.personalGoal);
  const [emailInput, setEmailInput] = useState(profile.email);
  const [phoneInput, setPhoneInput] = useState(profile.phone);
  const wisdomIdx = useRef(Math.floor(Math.random() * MARTY_WISDOM.length));
  const [configStatus, setConfigStatus] = useState<"unknown" | "initialized" | "not_initialized">("unknown");
  const [configError, setConfigError] = useState<string | null>(null);
  const [configSuccess, setConfigSuccess] = useState(false);

  // Check config status when wallet connects
  useEffect(() => {
    if (walletConnected) {
      isConfigInitialized().then((initialized) => {
        setConfigStatus(initialized ? "initialized" : "not_initialized");
      });
    } else {
      setConfigStatus("unknown");
    }
  }, [walletConnected, isConfigInitialized]);

  const [initLoading, setInitLoading] = useState(false);

  const handleInitConfig = async () => {
    setConfigError(null);
    setConfigSuccess(false);
    setInitLoading(true);
    try {
      const res = await onInitializeConfig();
      console.log("[ProfilePage] initConfig result:", res);
      if (res.success) {
        setConfigStatus("initialized");
        setConfigSuccess(true);
      } else {
        if (res.error?.includes("already") || res.error?.includes("already in use")) {
          setConfigStatus("initialized");
          setConfigSuccess(true);
        } else {
          setConfigError(res.error || "Failed to initialize config");
        }
      }
    } catch (e) {
      console.error("[ProfilePage] initConfig exception:", e);
      setConfigError(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setInitLoading(false);
    }
  };

  const earnedMilestones = MILESTONES_LIST.filter((m) => profile.streakMax >= m.days);

  const saveUsername = () => {
    onUpdateProfile({ username: usernameInput });
    setEditingUsername(false);
  };

  const saveGoal = () => {
    onUpdateProfile({ personalGoal: goalInput });
    setEditingGoal(false);
  };

  return (
    <div className="flex flex-col px-4 pt-4 pb-8 animate-fade-in">
      {/* Avatar + Username */}
      <div className="flex flex-col items-center mb-5">
        <button
          onClick={() => {/* Avatar change placeholder */}}
          className="relative mb-3"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted glow-border overflow-hidden">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl">
                {profile.username ? profile.username[0].toUpperCase() : "?"}
              </span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-teal">
            <Camera className="h-3.5 w-3.5 text-background" />
          </div>
        </button>

        {editingUsername ? (
          <div className="flex items-center gap-2">
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveUsername()}
              placeholder="Set username"
              autoFocus
              className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-foreground text-center focus:border-teal/40 focus:outline-none"
            />
            <button onClick={saveUsername} className="text-xs text-teal font-medium">
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditingUsername(true)}
            className="text-lg font-semibold text-foreground hover:text-teal transition-colors"
          >
            {profile.username || "Set Username"}
          </button>
        )}

        {publicKey && (
          <div className="flex items-center gap-2 mt-1">
            <p className="text-[10px] text-muted-foreground font-mono">
              {publicKey.toString().slice(0, 6)}...{publicKey.toString().slice(-4)}
            </p>
          </div>
        )}

        {connected && (
          <button
            onClick={() => disconnect()}
            className="mt-3 flex items-center gap-1.5 rounded-lg border border-destructive/30 px-3 py-1.5 text-[11px] font-medium text-destructive transition-all hover:bg-destructive/10 active:scale-[0.97]"
          >
            <LogOut className="h-3 w-3" />
            Disconnect Wallet
          </button>
        )}
      </div>

      {/* Goal — ABOVE the tiles */}
      <div className="mb-5 rounded-xl glass-card p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ash">
            My Goal
          </p>
          {!editingGoal && (
            <button
              onClick={() => setEditingGoal(true)}
              className="text-[10px] text-teal font-medium"
            >
              Edit
            </button>
          )}
        </div>
        {editingGoal ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="What are you working towards?"
              rows={2}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground placeholder:text-ash/50 focus:border-teal/40 focus:outline-none"
            />
            <button onClick={saveGoal} className="self-end text-xs text-teal font-medium">
              Save
            </button>
          </div>
        ) : (
          <p className="text-sm text-foreground leading-relaxed">
            {profile.personalGoal || (
              <span className="text-ash italic">Tap edit to set your goal...</span>
            )}
          </p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <button
          onClick={() => onNavigate("streak")}
          className="rounded-xl glass-card p-4 text-center transition-colors hover:bg-ink-lighter"
        >
          <Flame className="mx-auto h-5 w-5 text-teal mb-1" />
          <p className="text-xl font-bold text-foreground">{profile.streakCurrent}</p>
          <p className="text-[10px] text-muted-foreground">Current Streak</p>
        </button>
        <div className="rounded-xl glass-card p-4 text-center">
          <Trophy className="mx-auto h-5 w-5 text-sage mb-1" />
          <p className="text-xl font-bold text-foreground">{profile.streakMax}</p>
          <p className="text-[10px] text-muted-foreground">Best Streak</p>
        </div>
        <div className="rounded-xl glass-card p-4 text-center">
          <BookOpen className="mx-auto h-5 w-5 text-beige-pearl mb-1" />
          <p className="text-xl font-bold text-foreground">{profile.journalCount}</p>
          <p className="text-[10px] text-muted-foreground">Journal Entries</p>
        </div>
        <button
          onClick={() => onNavigate("milestones")}
          className="rounded-xl glass-card p-4 text-center transition-colors hover:bg-ink-lighter"
        >
          <Star className="mx-auto h-5 w-5 text-ash mb-1" />
          <p className="text-xl font-bold text-foreground">{earnedMilestones.length}</p>
          <p className="text-[10px] text-muted-foreground">Milestones</p>
        </button>
      </div>

      {/* Marty's Wisdom */}
      <div className="mb-5 rounded-xl bg-muted/40 p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-ash mb-1">
          Marty&rsquo;s Wisdom
        </p>
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          {MARTY_WISDOM[wisdomIdx.current]}
        </p>
      </div>

      {/* Account Details (hidden) */}
      <div className="mb-5">
        <button
          onClick={() => setShowHiddenDetails(!showHiddenDetails)}
          className="flex w-full items-center justify-between rounded-xl glass-card px-4 py-3"
        >
          <div className="flex items-center gap-2">
            {showHiddenDetails ? (
              <EyeOff className="h-4 w-4 text-ash" />
            ) : (
              <Eye className="h-4 w-4 text-ash" />
            )}
            <span className="text-sm text-foreground">Account Details</span>
          </div>
          <ChevronRight
            className={`h-4 w-4 text-ash transition-transform ${
              showHiddenDetails ? "rotate-90" : ""
            }`}
          />
        </button>

        {showHiddenDetails && (
          <div className="mt-2 space-y-2 px-2 animate-fade-in">
            <div className="rounded-xl bg-muted px-4 py-3">
              <label className="block text-[10px] text-ash mb-1">
                Email (optional, for verification)
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onBlur={() => onUpdateProfile({ email: emailInput })}
                placeholder="you@example.com"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-ash/40 focus:outline-none"
              />
            </div>
            <div className="rounded-xl bg-muted px-4 py-3">
              <label className="block text-[10px] text-ash mb-1">
                Phone (optional, for verification)
              </label>
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                onBlur={() => onUpdateProfile({ phone: phoneInput })}
                placeholder="+1 (555) 000-0000"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-ash/40 focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Subscription — clickable checkout buttons */}
      <div className="mb-5 space-y-2">
        <button
          onClick={() => {
            // In production this would open Stripe/payment checkout
            onUpdateProfile({ isSubscriber: !profile.isSubscriber });
          }}
          className="flex w-full items-center justify-between rounded-xl glass-card px-4 py-3 transition-colors hover:bg-ink-lighter"
        >
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-sage" />
            <div className="text-left">
              <span className="text-sm text-foreground block">Regular</span>
              <span className="text-[10px] text-muted-foreground">
                {profile.isSubscriber ? "Active" : "Chat with Marty, full journal history"}
              </span>
            </div>
          </div>
          {profile.isSubscriber ? (
            <span className="rounded-lg bg-sage/15 px-2.5 py-1 text-[10px] font-semibold text-sage">
              Active
            </span>
          ) : (
            <span className="rounded-lg bg-teal px-3 py-1.5 text-[10px] font-semibold text-background">
              Subscribe
            </span>
          )}
        </button>

        <button
          onClick={() => {
            // In production this would open Stripe/payment checkout
            onUpdateProfile({ isPremium: !profile.isPremium, isSubscriber: true });
          }}
          className="flex w-full items-center justify-between rounded-xl glass-card px-4 py-3 transition-colors hover:bg-ink-lighter"
        >
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-teal" />
            <div className="text-left">
              <span className="text-sm text-foreground block">Premium</span>
              <span className="text-[10px] text-muted-foreground">
                {profile.isPremium ? "Active" : "Voice mode, all features, priority support"}
              </span>
            </div>
          </div>
          {profile.isPremium ? (
            <span className="rounded-lg bg-teal/15 px-2.5 py-1 text-[10px] font-semibold text-teal">
              Active
            </span>
          ) : (
            <span className="rounded-lg bg-teal px-3 py-1.5 text-[10px] font-semibold text-background">
              Upgrade
            </span>
          )}
        </button>
      </div>

      {/* Milestones preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ash">
            Milestones
          </h3>
          <button
            onClick={() => onNavigate("milestones")}
            className="text-[10px] text-teal font-medium"
          >
            View All &rarr;
          </button>
        </div>

        <div className="space-y-2">
          {MILESTONES_LIST.slice(0, 4).map((m) => {
            const earned = profile.streakMax >= m.days;
            return (
              <div
                key={m.days}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 ${
                  earned ? "glass-card glow-border" : "bg-muted/30"
                }`}
              >
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    earned ? "bg-teal/15 text-teal" : "bg-ink-lighter text-ash"
                  }`}
                >
                  {earned ? <Star className="h-3.5 w-3.5" /> : m.days}
                </div>
                <div className="flex-1">
                  <p className={`text-xs font-medium ${earned ? "text-foreground" : "text-ash"}`}>
                    {m.label}
                  </p>
                </div>
                {earned && (
                  <span className="text-[9px] font-medium text-teal">Earned</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin: Initialize Config */}
      {walletConnected && (
        <div className="mb-5 rounded-xl glass-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="h-4 w-4 text-ash" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-ash">
              Program Admin
            </p>
          </div>

          {configStatus === "initialized" || configSuccess ? (
            <div className="flex items-center gap-2 rounded-lg bg-sage/10 px-3 py-2.5">
              <Check className="h-4 w-4 text-sage" />
              <span className="text-xs text-sage font-medium">Config initialized</span>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-muted-foreground mb-3">
                One-time setup. Initializes the program config with your wallet as authority.
              </p>
              {configError && (
                <div className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-[10px] text-destructive">
                  {configError}
                </div>
              )}
              <button
                onClick={handleInitConfig}
                disabled={initLoading || chainLoading || configStatus === "unknown"}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              >
                {initLoading || chainLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="h-4 w-4" />
                )}
                {initLoading || chainLoading ? "Initializing..." : "Initialize Config"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfilePage;