use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("4xNr9sqkav1JeuBky9PLrP158GmJuzqRF3NSd9kR6Q28");

const MILESTONE_THRESHOLDS: [u16; 9] = [1, 3, 7, 14, 30, 60, 90, 180, 365];
const MIN_TIP_LAMPORTS: u64 = 10_000_000;
const DAY_SECONDS: i64 = 86400;

#[program]
pub mod workspace {
    use super::*;

    // (no initialize_config params besides authority)
    // Token amounts: 1e9 format, Ex: 1000000000 = 1 SOL/TOKEN
    pub fn initialize_config(ctx: Context<InitializeConfig>) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.bump = ctx.bumps.config;
        config.authority = ctx.accounts.authority.key();
        config.is_active = true;
        config.is_paused = false;
        config.version = 1;
        Ok(())
    }

    pub fn init_profile(ctx: Context<InitProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.user.key();
        profile.streak_days = 0;
        profile.longest_streak = 0;
        profile.last_check_in = 0;
        profile.pet_type = 0;
        profile.pet_alive = false;
        profile.locked_tips = 0;
        profile.total_deposited = 0;
        profile.total_withdrawn = 0;
        profile.highest_milestone_reached = 0;
        profile.first_time_milestone_window = false;
        profile.milestone_window_deadline = 0;
        profile.bump = ctx.bumps.profile;
        Ok(())
    }

    pub fn check_in(ctx: Context<CheckIn>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        let now = Clock::get()?.unix_timestamp;

        let elapsed = now.checked_sub(profile.last_check_in).ok_or(ErrorCode::MathOverflow)?;

        if profile.last_check_in > 0 {
            if elapsed < DAY_SECONDS {
                return Err(ErrorCode::AlreadyCheckedIn.into());
            } else if elapsed < DAY_SECONDS * 2 {
                profile.streak_days = profile.streak_days.checked_add(1).ok_or(ErrorCode::MathOverflow)?;
            } else {
                profile.streak_days = 1;
                profile.pet_alive = false;
            }
        } else {
            profile.streak_days = 1;
        }

        if profile.streak_days > profile.longest_streak {
            profile.longest_streak = profile.streak_days;
        }

        let sd = profile.streak_days;
        let is_threshold = MILESTONE_THRESHOLDS.contains(&sd);
        if is_threshold && sd > profile.highest_milestone_reached {
            profile.first_time_milestone_window = true;
            profile.milestone_window_deadline = now.checked_add(DAY_SECONDS).ok_or(ErrorCode::MathOverflow)?;
            profile.highest_milestone_reached = sd;
        }

        profile.last_check_in = now;
        Ok(())
    }

    pub fn mint_pet(ctx: Context<MintPet>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.streak_days >= 1, ErrorCode::InactiveStreak);
        require!(profile.pet_type == 0, ErrorCode::PetAlreadyExists);

        let clock = Clock::get()?;
        let user_key = ctx.accounts.user.key();
        let key_bytes = user_key.to_bytes();
        let byte_sum: u64 = key_bytes.iter().map(|b| *b as u64).sum();
        let pet = ((clock.unix_timestamp as u64).wrapping_add(byte_sum) % 5) + 1;

        profile.pet_type = pet as u8;
        profile.pet_alive = true;
        Ok(())
    }

    pub fn regenerate_pet(ctx: Context<RegeneratePet>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(!profile.pet_alive, ErrorCode::PetStillAlive);
        require!(profile.streak_days >= 1, ErrorCode::InactiveStreak);

        let clock = Clock::get()?;
        let user_key = ctx.accounts.user.key();
        let key_bytes = user_key.to_bytes();
        let byte_sum: u64 = key_bytes.iter().map(|b| *b as u64).sum();
        let pet = ((clock.unix_timestamp as u64).wrapping_add(byte_sum) % 5) + 1;

        profile.pet_type = pet as u8;
        profile.pet_alive = true;
        Ok(())
    }

    pub fn add_tip(ctx: Context<AddTip>, amount: u64) -> Result<()> {
        require!(amount >= MIN_TIP_LAMPORTS, ErrorCode::TipTooSmall);

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.profile.to_account_info(),
                },
            ),
            amount,
        )?;

        let profile = &mut ctx.accounts.profile;
        profile.locked_tips = profile.locked_tips.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        profile.total_deposited = profile.total_deposited.checked_add(amount).ok_or(ErrorCode::MathOverflow)?;
        Ok(())
    }

    pub fn mint_milestone(ctx: Context<MintMilestone>, milestone_type: u16) -> Result<()> {
        require!(
            MILESTONE_THRESHOLDS.contains(&milestone_type),
            ErrorCode::InvalidMilestoneType
        );

        let profile = &ctx.accounts.profile;
        require!(
            profile.streak_days >= milestone_type || profile.longest_streak >= milestone_type,
            ErrorCode::InsufficientStreak
        );

        let milestone = &mut ctx.accounts.milestone;
        milestone.owner = ctx.accounts.user.key();
        milestone.milestone_type = milestone_type;
        milestone.minted_at = Clock::get()?.unix_timestamp;
        milestone.bump = ctx.bumps.milestone;
        Ok(())
    }

    pub fn withdraw_tips(ctx: Context<WithdrawTips>) -> Result<()> {
        let profile = &mut ctx.accounts.profile;
        require!(profile.locked_tips > 0, ErrorCode::InsufficientTips);

        let now = Clock::get()?.unix_timestamp;

        let withdraw_amount: u64;

        if profile.first_time_milestone_window && now <= profile.milestone_window_deadline {
            withdraw_amount = profile.locked_tips;
            profile.locked_tips = 0;
            profile.first_time_milestone_window = false;
        } else {
            if profile.first_time_milestone_window {
                profile.first_time_milestone_window = false;
            }

            let unlock_pct = if profile.longest_streak == 0 {
                0u64
            } else {
                (profile.streak_days as u64)
                    .checked_mul(100)
                    .ok_or(ErrorCode::MathOverflow)?
                    .checked_div(profile.longest_streak as u64)
                    .ok_or(ErrorCode::MathOverflow)?
            };

            withdraw_amount = profile
                .locked_tips
                .checked_mul(unlock_pct)
                .ok_or(ErrorCode::MathOverflow)?
                .checked_div(100)
                .ok_or(ErrorCode::MathOverflow)?;

            profile.locked_tips = profile
                .locked_tips
                .checked_sub(withdraw_amount)
                .ok_or(ErrorCode::MathOverflow)?;
        }

        profile.total_withdrawn = profile
            .total_withdrawn
            .checked_add(withdraw_amount)
            .ok_or(ErrorCode::MathOverflow)?;

        if withdraw_amount > 0 {
            let user_key = profile.owner;
            let bump_arr = [profile.bump];
            let seeds: &[&[u8]] = &[b"profile", user_key.as_ref(), &bump_arr];
            let signer_seeds: &[&[&[u8]]] = &[seeds];

            let profile_info = profile.to_account_info();
            let user_info = ctx.accounts.user.to_account_info();

            **profile_info.try_borrow_mut_lamports()? -= withdraw_amount;
            **user_info.try_borrow_mut_lamports()? += withdraw_amount;

            // We use direct lamport manipulation here because the profile PDA
            // is owned by our program, so system_program::transfer won't work.
            // The signer_seeds are kept for documentation but lamport manipulation
            // on program-owned accounts is the correct pattern.
            let _ = signer_seeds;
        }

        Ok(())
    }
}

// ── Context Structs ──

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        seeds = [b"config", authority.key().as_ref()],
        bump,
        payer = authority,
        space = 8 + Config::LEN
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(
        init,
        seeds = [b"profile", user.key().as_ref()],
        bump,
        payer = user,
        space = 8 + UserProfile::LEN
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckIn<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct MintPet<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RegeneratePet<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddTip<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(milestone_type: u16)]
pub struct MintMilestone<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(
        init,
        seeds = [b"milestone", user.key().as_ref(), &milestone_type.to_le_bytes()],
        bump,
        payer = user,
        space = 8 + Milestone::LEN
    )]
    pub milestone: Account<'info, Milestone>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawTips<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump = profile.bump,
        constraint = profile.owner == user.key() @ ErrorCode::Unauthorized
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// ── Account Structs ──

#[account]
pub struct Config {
    pub bump: u8,
    pub authority: Pubkey,
    pub is_active: bool,
    pub is_paused: bool,
    pub version: u8,
}

impl Config {
    pub const LEN: usize = 1 + 32 + 1 + 1 + 1;
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub streak_days: u16,
    pub longest_streak: u16,
    pub last_check_in: i64,
    pub pet_type: u8,
    pub pet_alive: bool,
    pub locked_tips: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub highest_milestone_reached: u16,
    pub first_time_milestone_window: bool,
    pub milestone_window_deadline: i64,
    pub bump: u8,
}

impl UserProfile {
    pub const LEN: usize = 32 + 2 + 2 + 8 + 1 + 1 + 8 + 8 + 8 + 2 + 1 + 8 + 1;
}

#[account]
pub struct Milestone {
    pub owner: Pubkey,
    pub milestone_type: u16,
    pub minted_at: i64,
    pub bump: u8,
}

impl Milestone {
    pub const LEN: usize = 32 + 2 + 8 + 1;
}

// ── Error Codes ──

#[error_code]
pub enum ErrorCode {
    #[msg("Already checked in today")]
    AlreadyCheckedIn,
    #[msg("Milestone already minted")]
    AlreadyMinted,
    #[msg("Invalid milestone type")]
    InvalidMilestoneType,
    #[msg("Insufficient streak for this milestone")]
    InsufficientStreak,
    #[msg("No tips to withdraw")]
    InsufficientTips,
    #[msg("Tip amount too small, minimum 0.01 SOL")]
    TipTooSmall,
    #[msg("Withdrawal decision window has expired")]
    WindowExpired,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Math overflow occurred")]
    MathOverflow,
    #[msg("No pet exists yet")]
    NoPet,
    #[msg("Pet is still alive, cannot regenerate")]
    PetStillAlive,
    #[msg("Already have a pet")]
    PetAlreadyExists,
    #[msg("Must have active streak")]
    InactiveStreak,
}
