import React from "react";
import { MessageCircle, PiggyBank, BookOpen, User } from "lucide-react";
import type { AppTab } from "@/hooks/useAppState";

interface BottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const tabs: { id: AppTab; icon: React.ElementType }[] = [
  { id: "marty", icon: MessageCircle },
  { id: "tipjar", icon: PiggyBank },
  { id: "journal", icon: BookOpen },
  { id: "profile", icon: User },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-app items-center justify-around py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {tabs.map(({ id, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`relative flex items-center justify-center rounded-xl p-3 transition-all duration-200 ${
                isActive
                  ? "text-teal"
                  : "text-ash hover:text-muted-foreground"
              }`}
            >
              <Icon
                className={`h-6 w-6 transition-transform duration-200 ${
                  isActive ? "scale-110" : ""
                }`}
                strokeWidth={isActive ? 2.2 : 1.6}
              />
              {isActive && (
                <div className="absolute -top-0.5 h-0.5 w-6 rounded-full bg-teal" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
