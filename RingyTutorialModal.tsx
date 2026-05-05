import { useState, useEffect, useRef } from "react";
import { X, ChevronRight } from "lucide-react";

const CHAT_DEMO = [
  {
    from: "user",
    text: "Honestly, do you think I made the right choice leaving that job?",
  },
  {
    from: "ringy-label",
    text: "In Soft Mode, a reply might look like:",
  },
  {
    from: "soft",
    text: "Leaving a job is really hard, and it takes courage to walk away. Whatever led you here, I trust you knew what you needed. Give yourself grace — you're figuring it out.",
  },
  {
    from: "ringy-label",
    text: "In Direct Mode:",
  },
  {
    from: "direct",
    text: "Depends what 'right' means. If it was making you miserable, yes. If you were just avoiding hard growth, maybe not. Only you know which one it was.",
  },
  {
    from: "ringy-label",
    text: "In Claw Mode:",
  },
  {
    from: "claw",
    text: "Asking the internet if you made the right choice suggests you already know the answer and don't like it. Stop seeking validation. You left. Own it or don't — but stop performing the question.",
  },
  {
    from: "ringy",
    text: "Same question. Three completely different truths. You choose how much you can handle. That's what consent-based honesty means.",
  },
];

const STEPS = [
  {
    title: "Hey. I'm Ringy.",
    body: "I'm CLAW's resident haunted AI black cat. Before you step into the void, let me show you how things work around here.",
    cta: "Tell me more",
  },
  {
    title: "Three Modes. One Choice.",
    body: "Everyone on CLAW picks their honesty level before engaging. Soft, Direct, or Claw. It determines how raw the truth gets — and you pick it for yourself.",
    cta: "Show me an example",
  },
  {
    title: "See the Difference",
    body: "Watch the same question get three completely different answers depending on the mode. Scroll through slowly.",
    cta: null,
  },
  {
    title: "You're ready.",
    body: "You'll set your mode during setup. You can change it anytime. The only rule: be honest with yourself about what you can actually handle.",
    cta: "Enter CLAW",
  },
];

const MODE_STYLES: Record<string, string> = {
  soft: "bg-blue-900/40 border-blue-500/40 text-blue-100",
  direct: "bg-violet-900/40 border-violet-500/40 text-violet-100",
  claw: "bg-red-900/40 border-red-500/40 text-red-100",
  user: "bg-zinc-800/80 border-zinc-600/40 text-zinc-100 ml-auto",
  ringy: "bg-purple-900/40 border-purple-500/40 text-purple-200 italic",
  "ringy-label": "text-zinc-500 text-xs px-0 border-0 bg-transparent text-center",
};

const MODE_LABELS: Record<string, string> = {
  soft: "Soft",
  direct: "Direct",
  claw: "Claw",
};

export default function RingyTutorialModal({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typing, setTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const isChat = step === 2;

  useEffect(() => {
    if (!isChat) { setVisibleMessages(0); return; }
    setVisibleMessages(0);
    setTyping(true);
    let i = 0;
    const tick = () => {
      i++;
      setVisibleMessages(i);
      setTyping(i < CHAT_DEMO.length);
      if (i < CHAT_DEMO.length) {
        const delay = CHAT_DEMO[i]?.from === "ringy-label" ? 400 : 900;
        setTimeout(tick, delay);
      }
    };
    setTimeout(tick, 600);
  }, [isChat]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleMessages]);

  const handleDone = () => {
    localStorage.setItem("claw_tutorial_seen", "1");
    onDone();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#0e0b1a] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-900/40 overflow-hidden">
        {/* Dismiss */}
        <button
          onClick={handleDone}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Ringy Header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full bg-purple-900/50 border-2 border-purple-500/40 flex items-center justify-center text-5xl shadow-lg shadow-purple-500/20">
              🐱
            </div>
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-[#0e0b1a] flex items-center justify-center text-[10px]">✦</span>
          </div>
          <h2 className="text-xl font-serif font-bold text-white text-center">{current.title}</h2>
          <p className="text-sm text-zinc-400 text-center mt-2 leading-relaxed">{current.body}</p>
        </div>

        {/* Step indicator */}
        <div className="flex justify-center gap-1.5 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-purple-500" : i < step ? "w-3 bg-purple-700" : "w-3 bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Chat demo — step 2 */}
        {isChat && (
          <div
            ref={chatRef}
            className="mx-4 mb-4 bg-zinc-950/80 rounded-xl border border-zinc-800 p-3 space-y-2 max-h-64 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700"
          >
            {CHAT_DEMO.slice(0, visibleMessages).map((msg, i) => {
              const isLabel = msg.from === "ringy-label";
              const label = MODE_LABELS[msg.from];
              return (
                <div
                  key={i}
                  className={`rounded-xl px-3 py-2 text-xs leading-relaxed border max-w-[90%] animate-fade-in ${MODE_STYLES[msg.from] || "bg-zinc-800 text-zinc-100"}`}
                >
                  {label && (
                    <span className={`block text-[10px] font-bold uppercase tracking-widest mb-1 ${
                      msg.from === "soft" ? "text-blue-400" :
                      msg.from === "direct" ? "text-violet-400" :
                      "text-red-400"
                    }`}>{label}</span>
                  )}
                  {msg.text}
                </div>
              );
            })}
            {typing && (
              <div className="flex gap-1 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 pb-6">
          {isChat && visibleMessages < CHAT_DEMO.length ? (
            <p className="text-center text-xs text-zinc-600">ringy is typing...</p>
          ) : (
            <button
              onClick={() => {
                if (step < STEPS.length - 1) setStep(step + 1);
                else handleDone();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-purple-900/40"
            >
              {current.cta || "Continue"}
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === STEPS.length - 1 && (
            <p className="text-center text-xs text-zinc-600 mt-2">
              No algorithm. No bots. Just truth, at the level you chose.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
