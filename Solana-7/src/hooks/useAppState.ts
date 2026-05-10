import { useState, useCallback, useEffect } from "react";

export type AppTab = "home" | "marty" | "tipjar" | "journal" | "profile" | "streak" | "milestones";

export interface JournalEntry {
  id: string;
  date: string;
  gratitude: [string, string, string];
  twoPeople: [string, string];
  oneMoment: string;
  timestamp: number;
}

export interface UserProfile {
  streakCurrent: number;
  streakMax: number;
  lastCheckIn: number;
  totalVaultLamports: number;
  petType: number;
  journalCount: number;
  isPremium: boolean;
  isSubscriber: boolean;
  petAlive: boolean;
  username: string;
  avatarUrl: string;
  personalGoal: string;
  email: string;
  phone: string;
  mintedMilestones: number[];
}

const DEFAULT_PROFILE: UserProfile = {
  streakCurrent: 0,
  streakMax: 0,
  lastCheckIn: 0,
  totalVaultLamports: 0,
  petType: 0,
  journalCount: 0,
  isPremium: false,
  isSubscriber: false,
  petAlive: true,
  username: "",
  avatarUrl: "",
  personalGoal: "",
  email: "",
  phone: "",
  mintedMilestones: [],
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable
  }
}

export function useAppState() {
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [profile, setProfile] = useState<UserProfile>(() =>
    loadFromStorage("bts_profile", DEFAULT_PROFILE)
  );
  const [journals, setJournals] = useState<JournalEntry[]>(() =>
    loadFromStorage("bts_journals", [])
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    saveToStorage("bts_profile", profile);
  }, [profile]);

  useEffect(() => {
    saveToStorage("bts_journals", journals);
  }, [journals]);

  // Check streak health (48h gap = broken streak, pet dies)
  useEffect(() => {
    if (profile.lastCheckIn > 0) {
      const hoursSince = (Date.now() - profile.lastCheckIn) / (1000 * 60 * 60);
      if (hoursSince > 48 && profile.streakCurrent > 0) {
        setProfile((prev) => ({
          ...prev,
          streakCurrent: 0,
          petAlive: prev.petType > 0 ? false : prev.petAlive,
        }));
      }
    }
  }, [profile.lastCheckIn, profile.streakCurrent]);

  const dailyCheckIn = useCallback(() => {
    const now = Date.now();
    setProfile((prev) => {
      const hoursSince = prev.lastCheckIn > 0
        ? (now - prev.lastCheckIn) / (1000 * 60 * 60)
        : 999;

      let newStreak = prev.streakCurrent;
      let alive = prev.petAlive;

      if (hoursSince > 48) {
        newStreak = 1;
        alive = prev.petType > 0 ? false : true;
      } else if (hoursSince >= 20) {
        newStreak = prev.streakCurrent + 1;
      }

      const newMax = Math.max(prev.streakMax, newStreak);

      return {
        ...prev,
        streakCurrent: newStreak,
        streakMax: newMax,
        lastCheckIn: now,
        journalCount: prev.journalCount + 1,
        petAlive: alive,
      };
    });
  }, []);

  const addJournal = useCallback(
    (entry: Omit<JournalEntry, "id" | "timestamp">) => {
      const newEntry: JournalEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setJournals((prev) => [newEntry, ...prev]);
      dailyCheckIn();
    },
    [dailyCheckIn]
  );

  const mintPet = useCallback(() => {
    const petType = Math.floor(Math.random() * 5) + 1;
    setProfile((prev) => ({ ...prev, petType, petAlive: true }));
    return petType;
  }, []);

  const regeneratePet = useCallback(() => {
    const petType = Math.floor(Math.random() * 5) + 1;
    setProfile((prev) => ({ ...prev, petType, petAlive: true }));
    return petType;
  }, []);

  const depositTip = useCallback((lamports: number) => {
    setProfile((prev) => ({
      ...prev,
      totalVaultLamports: prev.totalVaultLamports + lamports,
    }));
  }, []);

  const withdrawProportional = useCallback(() => {
    setProfile((prev) => {
      if (prev.streakMax === 0) return prev;
      const ratio = prev.streakCurrent >= prev.streakMax
        ? 1
        : prev.streakCurrent / prev.streakMax;
      const available = Math.floor(prev.totalVaultLamports * ratio);
      return { ...prev, totalVaultLamports: prev.totalVaultLamports - available };
    });
  }, []);

  const getUnlockPercentage = useCallback(() => {
    if (profile.streakMax === 0) return 0;
    if (profile.streakCurrent >= profile.streakMax) return 100;
    return Math.floor((profile.streakCurrent / profile.streakMax) * 100);
  }, [profile.streakCurrent, profile.streakMax]);

  const mintMilestone = useCallback((days: number) => {
    setProfile((prev) => {
      if (prev.mintedMilestones.includes(days)) return prev;
      return {
        ...prev,
        mintedMilestones: [...prev.mintedMilestones, days],
      };
    });
  }, []);

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }));
  }, []);

  return {
    activeTab,
    setActiveTab,
    profile,
    setProfile,
    journals,
    isLoading,
    setIsLoading,
    addJournal,
    mintPet,
    regeneratePet,
    depositTip,
    withdrawProportional,
    getUnlockPercentage,
    mintMilestone,
    updateProfile,
  };
}