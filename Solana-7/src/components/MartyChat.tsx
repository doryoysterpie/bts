import React, { useState, useRef, useEffect, useCallback } from "react";
import { Send, MessageSquare, Mic, Lock, Info, X } from "lucide-react";
import { MARTY_WISDOM, MARTY_SUGGESTED_PROMPTS, MARTY_RESPONSES } from "@/lib/constants";

interface MartyChatProps {
  isPremium: boolean;
  isSubscriber: boolean;
  onSubscribe: () => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "marty";
  text: string;
  timestamp: number;
}

type ChatMode = "text" | "voice";

const MartyChat: React.FC<MartyChatProps> = ({ isPremium, isSubscriber, onSubscribe }) => {
  const canChat = isPremium || isSubscriber;
  const [mode, setMode] = useState<ChatMode>("text");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showWisdom, setShowWisdom] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wisdomIdx = useRef(Math.floor(Math.random() * MARTY_WISDOM.length));

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const getMartyResponse = useCallback((text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes("margaret") || lower.includes("marty mann") || lower.includes("who is")) {
      return MARTY_RESPONSES.margaret;
    }
    if (lower.includes("struggling") || lower.includes("struggle") || lower.includes("help")) {
      return MARTY_RESPONSES.struggle;
    }
    if (lower.includes("need to hear") || lower.includes("tell me")) {
      return MARTY_RESPONSES.hear;
    }
    if (lower.includes("journey") || lower.includes("mean to you")) {
      return MARTY_RESPONSES.journey;
    }
    const defaults = [
      MARTY_RESPONSES.default,
      "Feelings aren't facts, but they are real. Sit with them. They'll pass — they always do.",
      "One meeting, one day, one breath. That's all it takes to start over. You've already started by opening this.",
      "The world told me women like me didn't get better. I proved them wrong. You will too, in your own way.",
      "Write it down if you can't say it. Whisper it if you can't write it. Think it if you can't whisper. The thought alone is a beginning.",
    ];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }, []);

  const sendMessage = useCallback((text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || !canChat) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: msgText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getMartyResponse(msgText);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "marty", text: response, timestamp: Date.now() },
      ]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  }, [input, canChat, getMartyResponse]);

  const handlePromptClick = (prompt: string) => {
    if (!canChat) return;
    sendMessage(prompt);
  };

  // Shared subscribe CTA
  const SubscribeCTA = () => (
    <button
      onClick={onSubscribe}
      className="mt-3 w-full rounded-xl bg-teal py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98]"
    >
      Subscribe to Unlock
    </button>
  );

  // ---- Voice mode ----
  if (mode === "voice") {
    return (
      <div className="flex flex-col h-full animate-fade-in">
        <div className="px-4 pt-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg font-semibold text-foreground">Marty</h2>
            <div className="flex items-center gap-1 rounded-xl bg-muted p-0.5">
              <button
                onClick={() => setMode("text")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ash transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
              <button
                className="flex items-center gap-1.5 rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal"
              >
                <Mic className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-teal/10 glow-border">
            <span className="text-4xl">🕊️</span>
          </div>

          <p className="mb-2 font-serif text-lg font-semibold text-foreground">
            {isHolding ? "Listening..." : "Talk to Marty"}
          </p>
          <p className="mb-10 text-xs text-muted-foreground italic text-center animate-pulse-soft">
            {MARTY_WISDOM[wisdomIdx.current]}
          </p>

          {isHolding && (
            <div className="mb-8 flex items-center gap-1">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-teal"
                  style={{
                    height: `${12 + Math.random() * 24}px`,
                    animation: `pulse-soft 0.8s ease-in-out infinite`,
                    animationDelay: `${i * 0.05}s`,
                  }}
                />
              ))}
            </div>
          )}

          {!canChat ? (
            <div className="flex flex-col items-center gap-2 w-full max-w-[260px]">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Lock className="h-8 w-8 text-ash" />
              </div>
              <p className="text-xs text-ash text-center">
                Voice conversations are available for subscribers
              </p>
              <SubscribeCTA />
            </div>
          ) : (
            <button
              onPointerDown={() => setIsHolding(true)}
              onPointerUp={() => setIsHolding(false)}
              onPointerLeave={() => setIsHolding(false)}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all duration-200 ${
                isHolding
                  ? "bg-teal scale-110 shadow-[0_0_40px_hsl(var(--muted-teal)/0.4)]"
                  : "bg-teal/20 hover:bg-teal/30"
              }`}
            >
              <Mic className={`h-8 w-8 ${isHolding ? "text-background" : "text-teal"}`} />
            </button>
          )}
          {canChat && (
            <p className="mt-3 text-[10px] text-ash">
              {isHolding ? "Release to send" : "Hold to speak"}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- Text mode ----
  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-foreground">Marty</h2>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-muted p-0.5">
              <button className="flex items-center gap-1.5 rounded-lg bg-teal/15 px-3 py-1.5 text-xs font-medium text-teal">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </button>
              <button
                onClick={() => setMode("voice")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-ash transition-colors hover:text-foreground"
              >
                <Mic className="h-3.5 w-3.5" />
                Voice
              </button>
            </div>
            <button
              onClick={() => setShowWisdom(!showWisdom)}
              className="rounded-lg bg-muted p-2 text-ash transition-colors hover:text-foreground"
            >
              {showWisdom ? <X className="h-4 w-4" /> : <Info className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showWisdom && (
          <div className="mt-2 rounded-lg bg-muted/80 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-ash mb-1">
              Marty&rsquo;s Wisdom
            </p>
            <p className="text-xs text-muted-foreground italic">
              {MARTY_WISDOM[wisdomIdx.current]}
            </p>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-teal/10">
              <span className="text-3xl">🕊️</span>
            </div>
            <p className="mb-1 font-serif text-lg font-semibold text-foreground">
              Hello, dear.
            </p>
            <p className="mb-8 text-xs text-muted-foreground text-center max-w-[280px]">
              I&rsquo;m Marty — or at least, the version of me that lives in your pocket.
              What&rsquo;s on your heart today?
            </p>

            {/* Suggested prompts */}
            <div className="w-full space-y-2">
              {MARTY_SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  disabled={!canChat}
                  className={`w-full rounded-xl border border-border px-4 py-3 text-left text-sm transition-all ${
                    canChat
                      ? "text-foreground hover:bg-muted/60 hover:border-teal/30 active:scale-[0.98]"
                      : "text-ash/50 cursor-not-allowed"
                  }`}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-teal/15 text-foreground rounded-br-md"
                      : "glass-card rounded-bl-md"
                  }`}
                >
                  {msg.role === "marty" && (
                    <p className="mb-1 text-[10px] font-semibold text-teal">Marty</p>
                  )}
                  <p className="text-sm leading-relaxed text-foreground">{msg.text}</p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3">
                  <p className="text-[10px] font-semibold text-teal mb-1">Marty</p>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse-soft"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-4">
        {!canChat ? (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-2 rounded-xl bg-muted/60 px-4 py-3 w-full">
              <Lock className="h-4 w-4 text-ash" />
              <p className="text-sm text-ash">
                I&rsquo;m here for you — subscribe to start chatting
              </p>
            </div>
            <button
              onClick={onSubscribe}
              className="w-full rounded-xl bg-teal py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98]"
            >
              Subscribe Now
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Talk to Marty..."
              className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-ash/50 focus:border-teal/40 focus:outline-none focus:ring-1 focus:ring-teal/20 transition-colors"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim()}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal text-background transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MartyChat;
