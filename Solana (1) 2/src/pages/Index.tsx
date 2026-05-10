import React, { useState, useCallback, useEffect } from "react";
import { useAppState } from "@/hooks/useAppState";
import { useBtsProgram } from "@/hooks/useBtsProgram";
import { MILESTONES_LIST } from "@/lib/constants";
import { fireCheckInConfetti, fireMilestoneConfetti } from "@/lib/confetti";
import LoadingScreen from "@/components/LoadingScreen";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/components/HomePage";
import JournalPage from "@/components/JournalPage";
import MartyChat from "@/components/MartyChat";
import TipJarPage from "@/components/TipJarPage";
import ProfilePage from "@/components/ProfilePage";
import StreakPage from "@/components/StreakPage";
import MilestonesPage from "@/components/MilestonesPage";
import type { AppTab } from "@/hooks/useAppState";

const Index: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    profile,
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
  } = useAppState();

  const bts = useBtsProgram();

  const [prevStreakMax, setPrevStreakMax] = useState(profile.streakMax);
  const [initialGratitude, setInitialGratitude] = useState("");


  // Sync on-chain minted milestones into local state
  useEffect(() => {
    if (bts.mintedMilestones.length > 0) {
      bts.mintedMilestones.forEach((d) => {
        if (!profile.mintedMilestones.includes(d)) {
          mintMilestone(d);
        }
      });
    }
  }, [bts.mintedMilestones, profile.mintedMilestones, mintMilestone]);

  // Sync on-chain streak into local profile
  useEffect(() => {
    if (bts.onChainProfile) {
      const ocp = bts.onChainProfile;
      if (ocp.streakDays > profile.streakCurrent || ocp.longestStreak > profile.streakMax) {
        updateProfile({
          streakCurrent: Math.max(profile.streakCurrent, ocp.streakDays),
          streakMax: Math.max(profile.streakMax, ocp.longestStreak),
        });
      }
      if (ocp.petType > 0 && profile.petType === 0) {
        updateProfile({ petType: ocp.petType, petAlive: ocp.petAlive });
      }
    }
  }, [bts.onChainProfile, profile.streakCurrent, profile.streakMax, profile.petType, updateProfile]);

  // Check for new milestones
  useEffect(() => {
    if (profile.streakMax > prevStreakMax) {
      const newMilestones = MILESTONES_LIST.filter(
        (m) => m.days > prevStreakMax && m.days <= profile.streakMax
      );
      if (newMilestones.length > 0) {
        fireMilestoneConfetti();
      }
      setPrevStreakMax(profile.streakMax);
    }
  }, [profile.streakMax, prevStreakMax]);

  const handleCheckInComplete = useCallback(async () => {
    fireCheckInConfetti();
    // On-chain check-in if wallet connected (auto-init profile if needed)
    if (bts.connected && bts.sdk) {
      try {
        const profile = await bts.sdk.fetchProfile();
        if (profile.success && !profile.data) {
          await bts.initProfile();
        }
        await bts.checkIn();
      } catch {
        // Silently fail — local state is the fallback
      }
    }
  }, [bts]);

  const handleNavigate = useCallback(
    (tab: AppTab) => {
      setActiveTab(tab);
    },
    [setActiveTab]
  );

  const handleSubscribe = useCallback(() => {
    updateProfile({ isSubscriber: true });
  }, [updateProfile]);


  if (isLoading) {
    return <LoadingScreen onFinish={() => setIsLoading(false)} />;
  }

  const isSubPage = activeTab === "streak" || activeTab === "milestones";
  const isHome = activeTab === "home";
  const isChat = activeTab === "marty";

  const renderTab = () => {
    switch (activeTab) {
      case "home":
        return (
          <HomePage
            profile={profile}
            onNavigate={handleNavigate}
            onStartGratitude={(text) => {
              setInitialGratitude(text);
              setActiveTab("journal");
            }}
          />
        );
      case "journal":
        return (
          <JournalPage
            journals={journals}
            isPremium={profile.isPremium}
            isSubscriber={profile.isSubscriber}
            initialGratitude={initialGratitude}
            onAddJournal={(entry) => {
              addJournal(entry);
              setInitialGratitude("");
            }}
            onCheckInComplete={handleCheckInComplete}
          />
        );
      case "marty":
        return (
          <MartyChat
            isPremium={profile.isPremium}
            isSubscriber={profile.isSubscriber}
            onSubscribe={handleSubscribe}
          />
        );
      case "tipjar":
        return (
          <TipJarPage
            totalVaultLamports={profile.totalVaultLamports}
            streakCurrent={profile.streakCurrent}
            streakMax={profile.streakMax}
            unlockPercentage={getUnlockPercentage()}
            onDeposit={depositTip}
            onWithdraw={withdrawProportional}
            onChainProfile={bts.onChainProfile}
            onChainUnlock={bts.unlockPercentage}
            onChainAddTip={bts.addTip}
            onChainWithdraw={bts.withdrawTips}
            chainLoading={bts.loading}
          />
        );
      case "profile":
        return (
          <ProfilePage
            profile={profile}
            onUpdateProfile={updateProfile}
            onNavigate={handleNavigate}
            onInitializeConfig={bts.initializeConfig}
            isConfigInitialized={async () => {
              if (!bts.sdk) return false;
              return bts.sdk.isConfigInitialized();
            }}
            walletConnected={bts.connected}
            chainLoading={bts.loading}
          />
        );
      case "streak":
        return (
          <StreakPage
            profile={profile}
            onMintPet={mintPet}
            onRegeneratePet={regeneratePet}
            onNavigate={handleNavigate}
            onChainMintPet={bts.mintPet}
            onChainRegeneratePet={bts.regeneratePet}
            chainLoading={bts.loading}
            walletConnected={bts.connected}
          />
        );
      case "milestones":
        return (
          <MilestonesPage
            profile={profile}
            onMintMilestone={mintMilestone}
            onNavigate={handleNavigate}
            onChainMint={bts.mintMilestone}
            walletConnected={bts.connected}
            chainLoading={bts.loading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!isHome && (
        <AppHeader
          streak={profile.streakCurrent}
          streakMax={profile.streakMax}
          onNavigate={handleNavigate}
        />
      )}

      <main
        className={`mx-auto w-full max-w-app ${
          isHome ? "pt-2" : "pt-14"
        } ${
          isChat ? "h-[calc(100vh-7.5rem)]" : isSubPage ? "pb-6" : "pb-20"
        }`}
      >
        {renderTab()}
      </main>

      {!isSubPage && (
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      )}

    </div>
  );
};

export default Index;