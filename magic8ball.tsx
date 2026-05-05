import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Share2, Check } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

function ShareButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch {}
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={share}
      className="flex items-center gap-2 text-purple-400/70 hover:text-purple-300 border border-purple-700/30 hover:border-purple-500/50 rounded-xl px-4 py-2 text-sm transition-all"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
      {copied ? "Copied!" : "Share This Answer"}
    </button>
  );
}

const ANSWERS_POSITIVE = [
  "It is certain.",
  "It is decidedly so.",
  "Without a doubt.",
  "Yes, definitely.",
  "You may rely on it.",
  "As I see it, yes.",
  "Most likely.",
  "Outlook good.",
  "Yes.",
  "Signs point to yes.",
];

const ANSWERS_NEUTRAL = [
  "Reply hazy, try again.",
  "Ask again later.",
  "Better not tell you now.",
  "Cannot predict now.",
  "Concentrate and ask again.",
];

const ANSWERS_NEGATIVE = [
  "Don't count on it.",
  "My reply is no.",
  "My sources say no.",
  "Outlook not so good.",
  "Very doubtful.",
];

const RINGY_COMMENTARY: Record<string, string> = {
  "It is certain.": "Certain, huh. Okay. Do something with that.",
  "It is decidedly so.": "Decidedly. That's a word that means you should stop hesitating.",
  "Without a doubt.": "No doubt. Just you, doubting anyway. Classic.",
  "Yes, definitely.": "Definitely. You're going to ask again just to be sure. Don't.",
  "You may rely on it.": "You may rely on it. You won't. But you may.",
  "As I see it, yes.": "I see yes. The 8 ball sees yes. Your gut saw yes first.",
  "Most likely.": "Most likely. Good enough. Go.",
  "Outlook good.": "Good outlook. Don't ruin it by overthinking.",
  "Yes.": "Yes. That's it. That's the whole thing.",
  "Signs point to yes.": "Signs point to yes. You've been ignoring signs for weeks.",
  "Reply hazy, try again.": "Hazy. Even the void is confused by your question. Clarify.",
  "Ask again later.": "Later. Even this magic ball needs a minute.",
  "Better not tell you now.": "Not now. Some truths need to ripen.",
  "Cannot predict now.": "Unpredictable. Like you. Like everything.",
  "Concentrate and ask again.": "Concentrate. Are you actually concentrating? Try harder.",
  "Don't count on it.": "Don't count on it. Put that down. Walk away.",
  "My reply is no.": "No. The 8 ball doesn't apologize.",
  "My sources say no.": "Sources say no. Even the ball has receipts.",
  "Outlook not so good.": "Not so good. You felt this already. Didn't you.",
  "Very doubtful.": "Very doubtful. Sometimes doubtful is the truth and the truth is a gift.",
};

function getRandomAnswer() {
  const roll = Math.random();
  if (roll < 0.5) return ANSWERS_POSITIVE[Math.floor(Math.random() * ANSWERS_POSITIVE.length)];
  if (roll < 0.7) return ANSWERS_NEUTRAL[Math.floor(Math.random() * ANSWERS_NEUTRAL.length)];
  return ANSWERS_NEGATIVE[Math.floor(Math.random() * ANSWERS_NEGATIVE.length)];
}

function getAnswerColor(answer: string) {
  if (ANSWERS_POSITIVE.includes(answer)) return "text-emerald-400";
  if (ANSWERS_NEUTRAL.includes(answer)) return "text-yellow-400";
  return "text-red-400";
}

export default function Magic8BallPage() {
  useSEO({
    title: "Magic 8 Ball — Ask Anything, Ringy Comments | CLAW",
    description: "The CLAW Magic 8 Ball gives you the classic 20 answers — and Ringy delivers her own pointed commentary on each one. You'll ask the same question three times. That's allowed.",
    canonical: "/magic8ball",
    keywords: "magic 8 ball, ask the 8 ball, CLAW magic 8 ball, Ringy 8 ball, free magic 8 ball online",
  });
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [revealAnimate, setRevealAnimate] = useState(false);
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);

  const shake = () => {
    if (shaking || !question.trim()) return;
    setShaking(true);
    setAnswer(null);
    setRevealAnimate(false);
    setTimeout(() => {
      const ans = getRandomAnswer();
      setAnswer(ans);
      setRevealAnimate(true);
      setShaking(false);
      setHistory(prev => [{ q: question.trim(), a: ans }, ...prev].slice(0, 6));
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") shake();
  };

  const ringyComment = answer ? RINGY_COMMENTARY[answer] : null;

  return (
    <div className="min-h-screen bg-[#060410] flex flex-col" style={{ background: "radial-gradient(ellipse at 50% 10%, rgba(0,0,60,0.6) 0%, #060410 70%)" }}>
      <div className="sticky top-0 z-10 bg-[#060410]/95 border-b border-purple-900/30 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/feed")} className="text-purple-400 hover:text-purple-300 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <span className="text-lg">🎱</span>
          <h1 className="text-white font-serif text-lg font-semibold">Magic 8 Ball</h1>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center py-10 px-4 max-w-2xl mx-auto w-full gap-8">
        <p className="text-purple-300/60 text-sm text-center">Ask the void. Receive a verdict. Argue with it silently.</p>

        <div className="flex flex-col items-center gap-0">
          <div
            className="relative flex items-center justify-center cursor-pointer select-none"
            onClick={shake}
            style={{ width: 220, height: 220 }}
          >
            <div
              className="w-52 h-52 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle at 35% 35%, #1a1a2e 0%, #000000 70%)",
                boxShadow: shaking
                  ? "0 0 60px rgba(100,100,255,0.8), 0 0 120px rgba(60,60,200,0.4), inset 0 0 40px rgba(0,0,80,0.8)"
                  : "0 0 30px rgba(60,60,180,0.4), 0 0 80px rgba(30,30,120,0.2), inset 0 0 30px rgba(0,0,50,0.6)",
                animation: shaking ? "eightBallShake 1s ease-in-out" : "eightBallFloat 4s ease-in-out infinite",
                transition: "box-shadow 0.4s ease",
              }}
            >
              {!shaking && (
                <div className="flex items-center justify-center" style={{ width: 88, height: 88 }}>
                  {answer && revealAnimate ? (
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle at 40% 40%, #0a0a40 0%, #000020 100%)",
                        animation: "eightBallReveal 0.4s ease-out both",
                      }}
                    >
                      <p className={`text-center font-bold text-[11px] leading-tight px-2 ${getAnswerColor(answer)}`}>{answer}</p>
                    </div>
                  ) : (
                    <span className="text-5xl font-black text-blue-900/60 select-none">8</span>
                  )}
                </div>
              )}
              {shaking && (
                <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(0,0,40,0.4)" }}>
                  <span className="text-blue-400/60 text-xl animate-pulse">✦</span>
                </div>
              )}
            </div>
            <div
              className="absolute top-3 right-5 w-6 h-6 rounded-full opacity-30"
              style={{ background: "radial-gradient(circle, rgba(255,255,255,0.6), transparent)", filter: "blur(2px)" }}
            />
          </div>
          <p className="text-purple-400/40 text-xs mt-2">Click the ball to shake</p>
        </div>

        {ringyComment && (
          <div className="w-full max-w-md bg-white/5 border border-purple-900/30 rounded-2xl px-5 py-3 flex items-start gap-3">
            <span className="text-lg shrink-0">🐱</span>
            <p className="text-purple-200/70 text-sm italic">"{ringyComment}"</p>
          </div>
        )}

        {answer && question && (
          <ShareButton text={`🎱 I asked the CLAW Magic 8 Ball:\n"${question}"\n\nIt said: ${answer}\n\nmystic.claw.app`} />
        )}

        <div className="w-full max-w-md flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the 8 ball anything..."
            className="flex-1 bg-white/5 border border-purple-900/40 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 transition-colors"
            maxLength={120}
          />
          <button
            onClick={shake}
            disabled={shaking || !question.trim()}
            className="bg-purple-800/60 hover:bg-purple-700/70 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm transition-colors font-medium"
          >
            Shake
          </button>
        </div>

        {history.length > 0 && (
          <div className="w-full max-w-md">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Recent readings</p>
            <div className="flex flex-col gap-2">
              {history.map((h, i) => (
                <div key={i} className="bg-white/3 border border-white/5 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className="text-blue-800/60 font-black text-sm shrink-0 mt-0.5">8</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/50 text-xs truncate">"{h.q}"</p>
                    <p className={`text-sm font-medium mt-0.5 ${getAnswerColor(h.a)}`}>{h.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes eightBallFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes eightBallShake {
          0%   { transform: rotate(0deg) scale(1); }
          10%  { transform: rotate(-15deg) scale(1.03); }
          25%  { transform: rotate(12deg) scale(0.97); }
          40%  { transform: rotate(-18deg) scale(1.04); }
          55%  { transform: rotate(14deg) scale(0.98); }
          70%  { transform: rotate(-10deg) scale(1.02); }
          85%  { transform: rotate(7deg) scale(0.99); }
          100% { transform: rotate(0deg) scale(1); }
        }
        @keyframes eightBallReveal {
          0%   { opacity: 0; transform: scale(0.5) rotate(-10deg); }
          70%  { opacity: 1; transform: scale(1.08) rotate(2deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
      `}</style>
    </div>
  );
}
