/**
 * BTS Sobriety Program SDK
 *
 * SDK for interacting with the bts.her Solana program:
 *   - Daily streak check-ins & virtual pet
 *   - Tip jar with milestone-based unlock
 *   - Milestone NFT minting (on-chain PDAs)
 *
 * Program: 4xNr9sqkav1JeuBky9PLrP158GmJuzqRF3NSd9kR6Q28
 */

import { BN, Program, Provider } from "@coral-xyz/anchor";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import IDL from "../idl/contractIDL.json";

// ── Types ────────────────────────────────────────────────────────────────

export interface OnChainProfile {
  owner: PublicKey;
  streakDays: number;
  longestStreak: number;
  lastCheckIn: number; // unix seconds
  petType: number; // 0=none, 1-5=species
  petAlive: boolean;
  lockedTips: number; // lamports
  totalDeposited: number;
  totalWithdrawn: number;
  highestMilestoneReached: number;
  firstTimeMilestoneWindow: boolean;
  milestoneWindowDeadline: number;
  bump: number;
}

export interface OnChainMilestone {
  owner: PublicKey;
  milestoneType: number;
  mintedAt: number;
  bump: number;
}

export interface SDKResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── SDK ──────────────────────────────────────────────────────────────────

export class BtsProgramSDK {
  private readonly provider: Provider;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly program: Program<any>;

  constructor(provider: Provider) {
    this.provider = provider;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.program = new Program(IDL as any, this.provider);
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private safeBN(value: unknown, defaultValue: number | string = 0): BN {
    if (value === null || value === undefined) return new BN(defaultValue);
    if (value instanceof BN) return value;
    if (typeof value === "number") {
      if (isNaN(value) || !isFinite(value)) return new BN(defaultValue);
      return new BN(Math.floor(Math.abs(value)).toString());
    }
    if (typeof value === "string") {
      const n = parseFloat(value);
      if (isNaN(n)) return new BN(defaultValue);
      return new BN(Math.floor(Math.abs(n)).toString());
    }
    return new BN(defaultValue);
  }

  private safeBNToNumber(value: unknown, defaultValue = 0): number {
    try {
      if (value && typeof (value as BN).toNumber === "function")
        return (value as BN).toNumber();
      return defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private async getPDA(
    seeds: (string | PublicKey | Buffer | Uint8Array)[]
  ): Promise<[PublicKey, number]> {
    const buffers = seeds.map((s) => {
      if (typeof s === "string") return Buffer.from(s, "utf8");
      if (s instanceof PublicKey) return s.toBuffer();
      if (s instanceof Uint8Array) return Buffer.from(s);
      return s;
    });
    return PublicKey.findProgramAddressSync(buffers, this.program.programId);
  }

  private u16Seed(val: number): Buffer {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(val);
    return b;
  }

  private solToLamports(sol: number): BN {
    return this.safeBN(Math.floor(sol * LAMPORTS_PER_SOL));
  }

  private async testConnection(): Promise<boolean> {
    try {
      if (!this.provider?.connection) return false;
      const { value } = await this.provider.connection.getLatestBlockhashAndContext("finalized");
      return !!(value && value.blockhash);
    } catch {
      return false;
    }
  }

  // ��─ PDA Derivers ────────────────────────────────────────────────────

  /** Derive config PDA ["config", authority] */
  async getConfigPDA(authority?: PublicKey): Promise<[PublicKey, number]> {
    const a = authority || this.provider.publicKey!;
    return this.getPDA(["config", a]);
  }

  /** Derive profile PDA ["profile", user] */
  async getProfilePDA(user?: PublicKey): Promise<[PublicKey, number]> {
    const u = user || this.provider.publicKey!;
    return this.getPDA(["profile", u]);
  }

  /** Derive milestone PDA ["milestone", user, milestone_type_le_bytes] */
  async getMilestonePDA(
    milestoneType: number,
    user?: PublicKey
  ): Promise<[PublicKey, number]> {
    const u = user || this.provider.publicKey!;
    return this.getPDA(["milestone", u, this.u16Seed(milestoneType)]);
  }

  // ── Account Fetchers ────────────────────────────────────────────────

  /** Fetch on-chain profile for the connected wallet or a given user */
  async fetchProfile(user?: PublicKey): Promise<SDKResult<OnChainProfile>> {
    const u = user || this.provider.publicKey;
    if (!u) return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA(u);
      const acct = await this.program.provider.connection.getAccountInfo(profilePda);
      if (!acct) return { success: true, data: undefined }; // not initialised yet

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded: any = this.program.coder.accounts.decode("userProfile", acct.data);

      return {
        success: true,
        data: {
          owner: decoded.owner,
          streakDays: decoded.streakDays ?? 0,
          longestStreak: decoded.longestStreak ?? 0,
          lastCheckIn: this.safeBNToNumber(decoded.lastCheckIn, 0),
          petType: decoded.petType ?? 0,
          petAlive: decoded.petAlive ?? false,
          lockedTips: this.safeBNToNumber(decoded.lockedTips, 0),
          totalDeposited: this.safeBNToNumber(decoded.totalDeposited, 0),
          totalWithdrawn: this.safeBNToNumber(decoded.totalWithdrawn, 0),
          highestMilestoneReached: decoded.highestMilestoneReached ?? 0,
          firstTimeMilestoneWindow: decoded.firstTimeMilestoneWindow ?? false,
          milestoneWindowDeadline: this.safeBNToNumber(decoded.milestoneWindowDeadline, 0),
          bump: decoded.bump ?? 0,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Fetch failed";
      if (msg.includes("Account does not exist"))
        return { success: true, data: undefined };
      return { success: false, error: msg };
    }
  }

  /** Fetch a specific milestone for a user */
  async fetchMilestone(
    milestoneType: number,
    user?: PublicKey
  ): Promise<SDKResult<OnChainMilestone | null>> {
    const u = user || this.provider.publicKey;
    if (!u) return { success: false, error: "Wallet not connected" };

    try {
      const [milestonePda] = await this.getMilestonePDA(milestoneType, u);
      const acct = await this.program.provider.connection.getAccountInfo(milestonePda);
      if (!acct) return { success: true, data: null };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded: any = this.program.coder.accounts.decode("milestone", acct.data);
      return {
        success: true,
        data: {
          owner: decoded.owner,
          milestoneType: decoded.milestoneType ?? 0,
          mintedAt: this.safeBNToNumber(decoded.mintedAt, 0),
          bump: decoded.bump ?? 0,
        },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Fetch failed";
      if (msg.includes("Account does not exist"))
        return { success: true, data: null };
      return { success: false, error: msg };
    }
  }

  /** Fetch all milestones minted by a user (checks all 9 thresholds) */
  async fetchAllMilestones(
    user?: PublicKey
  ): Promise<SDKResult<number[]>> {
    const u = user || this.provider.publicKey;
    if (!u) return { success: false, error: "Wallet not connected" };

    const thresholds = [1, 3, 7, 14, 30, 60, 90, 180, 365];
    const minted: number[] = [];

    try {
      for (const t of thresholds) {
        const result = await this.fetchMilestone(t, u);
        if (result.success && result.data) minted.push(t);
      }
      return { success: true, data: minted };
    } catch (error) {
      return { success: false, error: "Failed to fetch milestones" };
    }
  }

  // ── Instructions ────────────────────────────────────────────────────

  /** Initialize the program config (one-time admin action) */
  async initializeConfig(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [configPda] = await this.getConfigPDA();

      console.log("[BTS] initializeConfig", {
        configPda: configPda.toString(),
        authority: this.provider.publicKey.toString(),
        programId: this.program.programId.toString(),
      });

      const sig = await this.program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("[BTS] initializeConfig success:", sig);
      return { success: true, data: { signature: sig } };
    } catch (error) {
      console.error("[BTS] initializeConfig error:", error);
      const msg = error instanceof Error ? error.message : "Init config failed";
      if (msg.includes("already in use")) {
        return { success: true, data: { signature: "already-initialized" } };
      }
      if (msg.includes("reverted during simulation") || msg.includes("0x0")) {
        return { success: false, error: "Transaction failed. Make sure your wallet is on Devnet, not Mainnet." };
      }
      return { success: false, error: msg };
    }
  }

  /** Check if config is already initialized for this authority */
  async isConfigInitialized(authority?: PublicKey): Promise<boolean> {
    try {
      const [configPda] = await this.getConfigPDA(authority);
      const acct = await this.program.provider.connection.getAccountInfo(configPda);
      return acct !== null;
    } catch {
      return false;
    }
  }

  /** Initialise a user profile (first-time setup) */
  async initProfile(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();

      const sig = await this.program.methods
        .initProfile()
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Init failed";
      return { success: false, error: msg };
    }
  }

  /** Daily check-in — increments streak, may kill pet if 48h gap */
  async checkIn(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();

      const sig = await this.program.methods
        .checkIn()
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Check-in failed";
      return { success: false, error: msg };
    }
  }

  /** Mint a random virtual pet (requires streak >= 1, no existing pet) */
  async mintPet(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();

      const sig = await this.program.methods
        .mintPet()
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Mint pet failed";
      return { success: false, error: msg };
    }
  }

  /** Regenerate a dead pet (requires pet dead + streak >= 1) */
  async regeneratePet(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();

      const sig = await this.program.methods
        .regeneratePet()
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Regenerate failed";
      return { success: false, error: msg };
    }
  }

  /** Deposit SOL into the tip jar (min 0.01 SOL) */
  async addTip(solAmount: number): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };
    if (solAmount < 0.01)
      return { success: false, error: "Minimum tip is 0.01 SOL" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();
      const lamports = this.solToLamports(solAmount);

      const sig = await this.program.methods
        .addTip(lamports)
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Tip failed";
      return { success: false, error: msg };
    }
  }

  /**
   * Mint a milestone NFT (on-chain PDA).
   * milestoneType must be one of: 1, 3, 7, 14, 30, 60, 90, 180, 365
   */
  async mintMilestone(
    milestoneType: number
  ): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();
      const [milestonePda] = await this.getMilestonePDA(milestoneType);

      const sig = await this.program.methods
        .mintMilestone(milestoneType)
        .accounts({
          profile: profilePda,
          milestone: milestonePda,
          user: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Mint milestone failed";
      return { success: false, error: msg };
    }
  }

  /**
   * Withdraw from the tip jar.
   * - 100% if inside the first-time milestone window (24h)
   * - (streak_days / longest_streak)% otherwise
   */
  async withdrawTips(): Promise<SDKResult<{ signature: string }>> {
    if (!this.provider.publicKey)
      return { success: false, error: "Wallet not connected" };

    try {
      if (!(await this.testConnection()))
        return { success: false, error: "Network unavailable" };

      const [profilePda] = await this.getProfilePDA();

      const sig = await this.program.methods
        .withdrawTips()
        .accounts({
          profile: profilePda,
          user: this.provider.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      return { success: true, data: { signature: sig } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Withdraw failed";
      return { success: false, error: msg };
    }
  }

  // ── Utility ─────────────────────────────────────────────────────────

  /** Fetch SOL balance of the connected wallet */
  async fetchSolBalance(account?: PublicKey): Promise<SDKResult<number>> {
    const target = account || this.provider.publicKey;
    if (!target) return { success: false, error: "Wallet not connected" };

    try {
      const bal = await this.provider.connection.getBalance(target);
      return { success: true, data: bal / LAMPORTS_PER_SOL };
    } catch {
      return { success: false, error: "Failed to fetch balance" };
    }
  }

  /** Calculate unlock percentage for the tip jar */
  getUnlockPercentage(profile: OnChainProfile): number {
    if (profile.firstTimeMilestoneWindow) {
      const now = Math.floor(Date.now() / 1000);
      if (now <= profile.milestoneWindowDeadline) return 100;
    }
    if (profile.longestStreak === 0) return 0;
    if (profile.streakDays >= profile.longestStreak) return 100;
    return Math.floor((profile.streakDays / profile.longestStreak) * 100);
  }
}

export default BtsProgramSDK;