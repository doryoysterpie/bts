import React, { useState, useEffect } from "react";
import { MARTY_PILLARS } from "@/lib/constants";

interface LoadingScreenProps {
  onFinish: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinish }) => {
  const [pillarIndex, setPillarIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setPillarIndex((prev) => {
          if (prev >= MARTY_PILLARS.length - 1) {
            clearInterval(interval);
            setTimeout(onFinish, 800);
            return prev;
          }
          return prev + 1;
        });
        setFade(true);
      }, 400);
    }, 2000);

    return () => clearInterval(interval);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div
        className="absolute inset-0 opacity-40"
        style={{ background: "var(--gradient-glow)" }}
      />

      <div className="relative mb-12">
        <h1 className="font-serif text-4xl font-bold tracking-tight">
          <span className="text-foreground">bts</span>
        </h1>
      </div>

      <div className="relative px-8 text-center">
        <p
          className={`font-serif text-lg italic text-muted-foreground transition-opacity duration-400 ${
            fade ? "opacity-100" : "opacity-0"
          }`}
        >
          &ldquo;{MARTY_PILLARS[pillarIndex]}&rdquo;
        </p>
      </div>

      <div className="mt-12 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-teal"
            style={{
              animation: "pulse-soft 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.3}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default LoadingScreen;
