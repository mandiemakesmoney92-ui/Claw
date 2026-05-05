import { useEffect, useRef, useState } from "react";
import {
  incrementEchoVisit,
  getEchoVisitCount,
  isEchoNight,
  pickFragment,
  getMemoryResponse,
  shouldTriggerAnomaly,
  markAnomalyShown,
  ANOMALY_FRAGMENTS,
  incrementEchoEvent,
} from "@/lib/lachrymal-echoes";

interface Whisper {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  fontSize: number;
  anomaly: boolean;
}

const WHISPER_POSITIONS = [
  { x: 78, y: 88 }, { x: 5, y: 82 }, { x: 65, y: 6 },
  { x: 82, y: 45 }, { x: 3, y: 55 }, { x: 45, y: 92 },
  { x: 90, y: 20 }, { x: 12, y: 30 },
];

let whisperIdCounter = 0;

export default function LachrymalEchoes() {
  const [whispers, setWhispers] = useState<Whisper[]>([]);
  const hasInitialized = useRef(false);
  const night = isEchoNight();

  function spawnWhisper(text: string, anomaly = false) {
    const pos = WHISPER_POSITIONS[Math.floor(Math.random() * WHISPER_POSITIONS.length)];
    const id = ++whisperIdCounter;
    const w: Whisper = {
      id,
      text,
      x: pos.x + (Math.random() - 0.5) * 10,
      y: pos.y + (Math.random() - 0.5) * 10,
      opacity: anomaly ? 0.15 : (night ? 0.065 : 0.045),
      fontSize: anomaly ? 11 : (Math.random() < 0.3 ? 9 : 10),
      anomaly,
    };
    setWhispers(prev => [...prev, w]);
    incrementEchoEvent();
    setTimeout(() => setWhispers(prev => prev.filter(v => v.id !== id)), anomaly ? 5000 : 11000);
  }

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const visitCount = incrementEchoVisit();

    const memoryResponse = getMemoryResponse(visitCount);
    if (memoryResponse) {
      const delay = 15000 + Math.random() * 20000;
      setTimeout(() => spawnWhisper(memoryResponse), delay);
    }

    const nightBoost = night ? 0.25 : 0;
    if (Math.random() < (0.3 + nightBoost)) {
      const delay = 25000 + Math.random() * 60000;
      setTimeout(() => {
        spawnWhisper(pickFragment(visitCount));
      }, delay);
    }

    if (night && Math.random() < 0.45) {
      const delay = 90000 + Math.random() * 120000;
      setTimeout(() => {
        spawnWhisper(pickFragment(visitCount));
      }, delay);
    }

    if (shouldTriggerAnomaly(visitCount)) {
      markAnomalyShown();
      const delay = 45000 + Math.random() * 90000;
      setTimeout(() => {
        const fragment = ANOMALY_FRAGMENTS[Math.floor(Math.random() * ANOMALY_FRAGMENTS.length)];
        spawnWhisper(fragment, true);
      }, delay);
    }
  }, []);

  useEffect(() => {
    function handleTrigger(e: CustomEvent) {
      const { response } = e.detail || {};
      if (!response) return;
      const delay = 3000 + Math.random() * 8000;
      setTimeout(() => spawnWhisper(response), delay);
    }

    document.addEventListener("echo:trigger", handleTrigger as EventListener);
    return () => document.removeEventListener("echo:trigger", handleTrigger as EventListener);
  }, [night]);

  if (whispers.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9000] overflow-hidden" aria-hidden="true">
      {whispers.map(w => (
        <div
          key={w.id}
          className="absolute select-none"
          style={{
            left: `${w.x}%`,
            top: `${w.y}%`,
            opacity: w.opacity,
            fontSize: `${w.fontSize}px`,
            fontFamily: w.anomaly ? "monospace" : "serif",
            fontStyle: "italic",
            color: w.anomaly ? "#c4a8ff" : "#ffffff",
            letterSpacing: "0.03em",
            lineHeight: 1.4,
            animation: `echoWhisperFade ${w.anomaly ? "5s" : "11s"} ease-out forwards`,
            maxWidth: "200px",
            textAlign: "left",
            whiteSpace: "nowrap",
          }}
        >
          {w.text}
        </div>
      ))}
      <style>{`
        @keyframes echoWhisperFade {
          0%   { opacity: 0; transform: translateY(4px); }
          12%  { opacity: 1; }
          75%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
