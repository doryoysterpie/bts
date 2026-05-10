import { useMemo, useState, useCallback, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { BtsProgramSDK, type OnChainProfile } from "@/lib/btsProgram";

/**
 * React hook for the BTS on-chain program.
 * Provides SDK instance, on-chain profile, and action helpers.
 */
export function useBtsProgram() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions, connected } =
    useWallet();

  const [onChainProfile, setOnChainProfile] = useState<OnChainProfile | null>(
    null
  );
  const [mintedMilestones, setMintedMilestones] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build provider + SDK
  const provider = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;
    return new AnchorProvider(
      connection,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { publicKey, signTransaction, signAllTransactions } as any,
      { commitment: "confirmed" }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  const sdk = useMemo(() => {
    if (!provider) return null;
    return new BtsProgramSDK(provider);
  }, [provider]);

  // Refresh on-chain data
  const refreshProfile = useCallback(async () => {
    if (!sdk || !publicKey) {
      setOnChainProfile(null);
      setMintedMilestones([]);
      return;
    }

    try {
      const [profileRes, milestonesRes] = await Promise.all([
        sdk.fetchProfile(),
        sdk.fetchAllMilestones(),
      ]);

      if (profileRes.success && profileRes.data) {
        setOnChainProfile(profileRes.data);
      } else {
        setOnChainProfile(null);
      }

      if (milestonesRes.success && milestonesRes.data) {
        setMintedMilestones(milestonesRes.data);
      }
    } catch {
      // silently fail — local state is the fallback
    }
  }, [sdk, publicKey]);

  // Auto-refresh on wallet change
  useEffect(() => {
    if (connected && sdk) {
      refreshProfile();
    } else {
      setOnChainProfile(null);
      setMintedMilestones([]);
    }
  }, [connected, sdk, refreshProfile]);

  // ── Wrapped actions ─────────────────────────────────────────────────

  const initializeConfig = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.initializeConfig();
      if (!res.success) setError(res.error || "Init config failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk]);

  const initProfile = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.initProfile();
      if (res.success) await refreshProfile();
      else setError(res.error || "Init failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk, refreshProfile]);

  const checkIn = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.checkIn();
      if (res.success) await refreshProfile();
      else setError(res.error || "Check-in failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk, refreshProfile]);

  const mintPet = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.mintPet();
      if (res.success) await refreshProfile();
      else setError(res.error || "Mint pet failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk, refreshProfile]);

  const regeneratePet = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.regeneratePet();
      if (res.success) await refreshProfile();
      else setError(res.error || "Regenerate failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk, refreshProfile]);

  const addTip = useCallback(
    async (solAmount: number) => {
      if (!sdk) return { success: false, error: "SDK not ready" };
      setLoading(true);
      setError(null);
      try {
        const res = await sdk.addTip(solAmount);
        if (res.success) await refreshProfile();
        else setError(res.error || "Tip failed");
        return res;
      } finally {
        setLoading(false);
      }
    },
    [sdk, refreshProfile]
  );

  const mintMilestone = useCallback(
    async (days: number) => {
      if (!sdk) return { success: false, error: "SDK not ready" };
      setLoading(true);
      setError(null);
      try {
        const res = await sdk.mintMilestone(days);
        if (res.success) await refreshProfile();
        else setError(res.error || "Mint milestone failed");
        return res;
      } finally {
        setLoading(false);
      }
    },
    [sdk, refreshProfile]
  );

  const withdrawTips = useCallback(async () => {
    if (!sdk) return { success: false, error: "SDK not ready" };
    setLoading(true);
    setError(null);
    try {
      const res = await sdk.withdrawTips();
      if (res.success) await refreshProfile();
      else setError(res.error || "Withdraw failed");
      return res;
    } finally {
      setLoading(false);
    }
  }, [sdk, refreshProfile]);

  const unlockPercentage = useMemo(() => {
    if (!onChainProfile || !sdk) return 0;
    return sdk.getUnlockPercentage(onChainProfile);
  }, [onChainProfile, sdk]);

  return {
    sdk,
    connected,
    publicKey,
    onChainProfile,
    mintedMilestones,
    unlockPercentage,
    loading,
    error,
    refreshProfile,
    initializeConfig,
    initProfile,
    checkIn,
    mintPet,
    regeneratePet,
    addTip,
    mintMilestone,
    withdrawTips,
  };
}