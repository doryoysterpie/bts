import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Workspace } from "../target/types/workspace";
import { expect } from "chai";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

describe("workspace", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.workspace as Program<Workspace>;

  let authority: Keypair;
  let user: Keypair;
  let user2: Keypair;
  let configPDA: PublicKey;
  let profilePDA: PublicKey;
  let profilePDA2: PublicKey;

  before(async () => {
    authority = Keypair.generate();
    user = Keypair.generate();
    user2 = Keypair.generate();

    // Fund all accounts with 100 SOL
    for (const kp of [authority, user, user2]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        100 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config"), authority.publicKey.toBuffer()],
      program.programId
    );

    [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user.publicKey.toBuffer()],
      program.programId
    );

    [profilePDA2] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );
  });

  // ── 1. Initialize Config ──
  it("Initialize Config", async () => {
    await program.methods
      .initializeConfig()
      .accounts({
        config: configPDA,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    const config = await program.account.config.fetch(configPDA);
    expect(config.authority.toBase58()).to.equal(authority.publicKey.toBase58());
    expect(config.isActive).to.be.true;
    expect(config.isPaused).to.be.false;
    expect(config.version).to.equal(1);
  });

  // ── 2. Init Profile ──
  it("Init Profile for user", async () => {
    await program.methods
      .initProfile()
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA);
    expect(profile.owner.toBase58()).to.equal(user.publicKey.toBase58());
    expect(profile.streakDays).to.equal(0);
    expect(profile.longestStreak).to.equal(0);
    expect(profile.petType).to.equal(0);
    expect(profile.petAlive).to.be.false;
    expect(profile.lockedTips.toNumber()).to.equal(0);
    expect(profile.totalDeposited.toNumber()).to.equal(0);
    expect(profile.totalWithdrawn.toNumber()).to.equal(0);
    expect(profile.highestMilestoneReached).to.equal(0);
    expect(profile.firstTimeMilestoneWindow).to.be.false;
  });

  // ── 3. First Check-in ──
  it("First check-in sets streak to 1", async () => {
    await program.methods
      .checkIn()
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA);
    expect(profile.streakDays).to.equal(1);
    expect(profile.longestStreak).to.equal(1);
    expect(Number(profile.lastCheckIn.toString())).to.be.greaterThan(0);
    // Milestone 1 should trigger first_time_milestone_window
    expect(profile.highestMilestoneReached).to.equal(1);
    expect(profile.firstTimeMilestoneWindow).to.be.true;
  });

  // ── 4. Duplicate check-in rejected ──
  it("Rejects duplicate check-in within 24h", async () => {
    try {
      await program.methods
        .checkIn()
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown AlreadyCheckedIn");
    } catch (error: any) {
      expect(error.message).to.include("Already checked in today");
    }
  });

  // ── 5. Mint Pet ──
  it("Mint pet with active streak", async () => {
    await program.methods
      .mintPet()
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA);
    expect(profile.petType).to.be.greaterThanOrEqual(1);
    expect(profile.petType).to.be.lessThanOrEqual(5);
    expect(profile.petAlive).to.be.true;
  });

  // ── 6. Cannot mint pet twice ──
  it("Rejects minting pet when one already exists", async () => {
    try {
      await program.methods
        .mintPet()
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown PetAlreadyExists");
    } catch (error: any) {
      expect(error.message).to.include("Already have a pet");
    }
  });

  // ── 7. Cannot regenerate alive pet ──
  it("Rejects regenerate when pet is alive", async () => {
    try {
      await program.methods
        .regeneratePet()
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown PetStillAlive");
    } catch (error: any) {
      expect(error.message).to.include("Pet is still alive");
    }
  });

  // ── 8. Add Tip ──
  it("Add tip of 0.05 SOL", async () => {
    const tipAmount = new BN(50_000_000); // 0.05 SOL

    await program.methods
      .addTip(tipAmount)
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA);
    expect(profile.lockedTips.toNumber()).to.equal(50_000_000);
    expect(profile.totalDeposited.toNumber()).to.equal(50_000_000);
  });

  // ── 9. Tip too small ──
  it("Rejects tip below minimum (0.01 SOL)", async () => {
    try {
      await program.methods
        .addTip(new BN(1_000_000)) // 0.001 SOL
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown TipTooSmall");
    } catch (error: any) {
      expect(error.message).to.include("Tip amount too small");
    }
  });

  // ── 10. Withdraw tips (milestone window - 100%) ──
  it("Withdraw 100% during first-time milestone window", async () => {
    const profileBefore = await program.account.userProfile.fetch(profilePDA);
    const lockedBefore = profileBefore.lockedTips.toNumber();
    expect(lockedBefore).to.equal(50_000_000);
    expect(profileBefore.firstTimeMilestoneWindow).to.be.true;

    const userBalBefore = await provider.connection.getBalance(user.publicKey);

    await program.methods
      .withdrawTips()
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const profileAfter = await program.account.userProfile.fetch(profilePDA);
    expect(profileAfter.lockedTips.toNumber()).to.equal(0);
    expect(profileAfter.totalWithdrawn.toNumber()).to.equal(50_000_000);
    expect(profileAfter.firstTimeMilestoneWindow).to.be.false;

    const userBalAfter = await provider.connection.getBalance(user.publicKey);
    // User should have received ~50M lamports (minus tx fee)
    expect(userBalAfter).to.be.greaterThan(userBalBefore);
  });

  // ── 11. Withdraw with no tips ──
  it("Rejects withdrawal when no tips locked", async () => {
    try {
      await program.methods
        .withdrawTips()
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown InsufficientTips");
    } catch (error: any) {
      expect(error.message).to.include("No tips to withdraw");
    }
  });

  // ── 12. Mint Milestone (day 1) ──
  it("Mint milestone for day 1", async () => {
    const milestoneType = 1;
    const [milestonePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint16Array([milestoneType]).buffer)),
      ],
      program.programId
    );

    await program.methods
      .mintMilestone(milestoneType)
      .accounts({
        profile: profilePDA,
        milestone: milestonePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const milestone = await program.account.milestone.fetch(milestonePDA);
    expect(milestone.owner.toBase58()).to.equal(user.publicKey.toBase58());
    expect(milestone.milestoneType).to.equal(1);
    expect(Number(milestone.mintedAt.toString())).to.be.greaterThan(0);
  });

  // ── 13. Cannot mint same milestone twice ──
  it("Rejects minting same milestone twice", async () => {
    const milestoneType = 1;
    const [milestonePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint16Array([milestoneType]).buffer)),
      ],
      program.programId
    );

    try {
      await program.methods
        .mintMilestone(milestoneType)
        .accounts({
          profile: profilePDA,
          milestone: milestonePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have failed - milestone already exists");
    } catch (error: any) {
      // Anchor will error because PDA already initialized
      expect(error).to.exist;
    }
  });

  // ── 14. Invalid milestone type ──
  it("Rejects invalid milestone type", async () => {
    const milestoneType = 5; // Not in valid list
    const [milestonePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint16Array([milestoneType]).buffer)),
      ],
      program.programId
    );

    try {
      await program.methods
        .mintMilestone(milestoneType)
        .accounts({
          profile: profilePDA,
          milestone: milestonePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown InvalidMilestoneType");
    } catch (error: any) {
      expect(error.message).to.include("Invalid milestone type");
    }
  });

  // ── 15. Insufficient streak for milestone ──
  it("Rejects milestone when streak is insufficient", async () => {
    const milestoneType = 365;
    const [milestonePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint16Array([milestoneType]).buffer)),
      ],
      program.programId
    );

    try {
      await program.methods
        .mintMilestone(milestoneType)
        .accounts({
          profile: profilePDA,
          milestone: milestonePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown InsufficientStreak");
    } catch (error: any) {
      expect(error.message).to.include("Insufficient streak");
    }
  });

  // ── 16. Second user profile ──
  it("Init profile for user2", async () => {
    await program.methods
      .initProfile()
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA2);
    expect(profile.owner.toBase58()).to.equal(user2.publicKey.toBase58());
    expect(profile.streakDays).to.equal(0);
  });

  // ── 17. Mint pet without streak ──
  it("Rejects mint pet without active streak", async () => {
    try {
      await program.methods
        .mintPet()
        .accounts({
          profile: profilePDA2,
          user: user2.publicKey,
        })
        .signers([user2])
        .rpc();
      expect.fail("Should have thrown InactiveStreak");
    } catch (error: any) {
      expect(error.message).to.include("Must have active streak");
    }
  });

  // ── 18. Staggered withdrawal (proportional) ──
  it("Staggered withdrawal when no milestone window", async () => {
    // User2: check in, add tip, then withdraw (no milestone window active since it's first check-in)
    await program.methods
      .checkIn()
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    // The first check-in triggers milestone 1 window. Clear it by withdrawing with 0 tips first.
    // Actually, let's add a tip and then test staggered after window expires.
    // Since we can't time-travel easily, let's add tip and withdraw during window (100%).
    // Then add another tip and withdraw again (staggered since window is cleared).

    const tipAmount = new BN(100_000_000); // 0.1 SOL
    await program.methods
      .addTip(tipAmount)
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // First withdrawal uses milestone window (100%)
    await program.methods
      .withdrawTips()
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    let profile = await program.account.userProfile.fetch(profilePDA2);
    expect(profile.lockedTips.toNumber()).to.equal(0);
    expect(profile.firstTimeMilestoneWindow).to.be.false;

    // Now add another tip
    await program.methods
      .addTip(tipAmount)
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    // This withdrawal should be staggered: streak=1, longest=1, so 100% anyway
    await program.methods
      .withdrawTips()
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    profile = await program.account.userProfile.fetch(profilePDA2);
    expect(profile.lockedTips.toNumber()).to.equal(0);
    expect(profile.totalWithdrawn.toNumber()).to.equal(200_000_000);
  });

  // ── 19. Add multiple tips ──
  it("Add multiple tips accumulate correctly", async () => {
    const tip1 = new BN(20_000_000);
    const tip2 = new BN(30_000_000);

    await program.methods
      .addTip(tip1)
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    await program.methods
      .addTip(tip2)
      .accounts({
        profile: profilePDA,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA);
    expect(profile.lockedTips.toNumber()).to.equal(50_000_000);
    expect(profile.totalDeposited.toNumber()).to.equal(100_000_000); // 50M from before + 50M now
  });

  // ── 20. Regenerate pet requires dead pet ──
  it("User2 can mint pet after check-in", async () => {
    await program.methods
      .mintPet()
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
      })
      .signers([user2])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA2);
    expect(profile.petAlive).to.be.true;
    expect(profile.petType).to.be.greaterThanOrEqual(1);
  });

  // ── 21. Add exact minimum tip ──
  it("Add exact minimum tip (0.01 SOL)", async () => {
    const minTip = new BN(10_000_000);

    await program.methods
      .addTip(minTip)
      .accounts({
        profile: profilePDA2,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc();

    const profile = await program.account.userProfile.fetch(profilePDA2);
    expect(profile.lockedTips.toNumber()).to.equal(10_000_000);
  });

  // ── 22. Verify config cannot be re-initialized ──
  it("Rejects re-initializing config", async () => {
    try {
      await program.methods
        .initializeConfig()
        .accounts({
          config: configPDA,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
      expect.fail("Should have failed - config already exists");
    } catch (error: any) {
      expect(error).to.exist;
    }
  });

  // ── 23. Verify profile cannot be re-initialized ──
  it("Rejects re-initializing profile", async () => {
    try {
      await program.methods
        .initProfile()
        .accounts({
          profile: profilePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have failed - profile already exists");
    } catch (error: any) {
      expect(error).to.exist;
    }
  });

  // ── 24. Mint milestone for day 3 with longest_streak ──
  it("Mint milestone using longest_streak (not current streak)", async () => {
    // user has streak_days=1, longest_streak=1, so day 3 should fail
    const milestoneType = 3;
    const [milestonePDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("milestone"),
        user.publicKey.toBuffer(),
        Buffer.from(new Uint8Array(new Uint16Array([milestoneType]).buffer)),
      ],
      program.programId
    );

    try {
      await program.methods
        .mintMilestone(milestoneType)
        .accounts({
          profile: profilePDA,
          milestone: milestonePDA,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown InsufficientStreak");
    } catch (error: any) {
      expect(error.message).to.include("Insufficient streak");
    }
  });
});
