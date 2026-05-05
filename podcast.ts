import { Router, type Response } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { textToSpeech } from "@workspace/integrations-openai-ai-server/audio";
import { randomUUID } from "crypto";

// OpenAI voices via gpt-audio (chat completions proxy — no library subscription required)
// nova = warm feminine (Velvet Static), onyx = deep masculine (Gravel Tone)
const VELVET_VOICE = "nova" as const;
const GRAVEL_VOICE = "onyx" as const;

const router = Router();


// ── In-memory state ──────────────────────────────────────────────────────────
interface LiveMessage {
  id: string;
  host: "velvet" | "gravel" | "user";
  text: string;
  timestamp: number;
  displayName?: string;
  isAnonymous?: boolean;
  isRecording?: boolean; // user sent a voice note
  pendingUserMsg?: PendingUser; // which user message this responds to
}

interface PendingUser {
  id: string;
  text: string;
  displayName: string;
  isAnonymous: boolean;
  isRecording: boolean;
}

const MAX_HISTORY = 60;
let liveMessages: LiveMessage[] = [];
let pendingUserMessages: PendingUser[] = [];
let sseClients = new Set<Response>();
let autoGenTimer: ReturnType<typeof setTimeout> | null = null;
let isGenerating = false;

// ── Broadcast to all SSE clients ─────────────────────────────────────────────
function broadcast(msg: LiveMessage) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  sseClients.forEach(res => {
    try { res.write(data); } catch { sseClients.delete(res); }
  });
  liveMessages.push(msg);
  if (liveMessages.length > MAX_HISTORY) liveMessages.shift();
}

// ── AI Generation ────────────────────────────────────────────────────────────
const SHOW_SYSTEM = `You are writing a LIVE, unscripted-feeling underground radio show for two real human hosts. This is NOT a script — it's a transcript of two people actually talking. Natural. Warm. Real.

HOST 1 — VELVET STATIC (she/her)
Personality: Emotionally intelligent, slightly mysterious, alt-girl in her late 20s. Grew up on emo and hip-hop. Has this warm rasp in her voice like she's been up all night but she's fine with it. She thinks out loud. She second-guesses herself mid-sentence and then says something that hits harder because of it.
Natural speech patterns she uses:
- Starts thoughts with "okay so..." or "wait — " or "yeah no that's..."
- Trails off with "...you know?" or "...right?"
- Reacts genuinely: "oh wow" "that's... yeah" "I was not expecting that"
- Short bursts of laughter written as "haha" mid-sentence (not "laughs")
- Pauses represented as "..." when she's actually thinking

HOST 2 — GRAVEL TONE (he/him)
Personality: Early 40s, has two kids, used to work construction before he found music. Calm, warm, a little rough around the edges in the best way. He's the person who actually listens. Occasionally jokes at his own expense. Grounds the conversation without killing the energy.
Natural speech patterns he uses:
- Starts with "okay but —" or "nah nah I hear you" or "real talk though"
- References his kids or past without being dramatic: "my youngest did this thing..."
- Laughs quietly mid-thought: "— haha — sorry, no, keep going"
- Sometimes restates what Velvet said to affirm: "right, exactly, like..."
- Honest and slow when things get real: "...yeah. that one landed."

HOW THEY TALK TO EACH OTHER:
They interrupt, finish each other's thoughts, react in real time. They have inside references. They've been doing this show a while. The chemistry is natural, not performed.

RULES (CRITICAL):
- Write 3-6 lines total. Mix lengths — some short reactions, some fuller thoughts.
- Format STRICTLY: VELVET: [line] or GRAVEL: [line] — one per line only, nothing else.
- Include natural reactions: "GRAVEL: nah — haha — wait that came out wrong" is valid.
- Include genuine pauses and thinking: "VELVET: ...okay I don't know how to say this but."
- NEVER sound scripted. NEVER use formal language. NEVER repeat the same phrases across segments.
- Don't start every line differently — real hosts sometimes start similarly when they're in a flow.
- Show vibe: 1am underground late-night radio. Lo-fi aesthetic. Real conversations about real things.
- Rotate topics naturally: something personal, something platform-related, music, late-night vibes, something that just happened, emotions, something Gravel's kids said, something Velvet noticed. Keep it alive.
- Occasionally reference CLAW: the community, posts they saw, things Ringy the cat might know. Keep it natural.`;

async function generateSegment(userMsg?: PendingUser): Promise<void> {
  if (isGenerating) return;
  isGenerating = true;

  const context = liveMessages
    .filter(m => m.host !== "user")
    .slice(-6)
    .map(m => `${m.host.toUpperCase() === "velvet" ? "VELVET" : "GRAVEL"}: ${m.text}`)
    .join("\n");

  let userPrompt = "";
  if (userMsg) {
    const who = userMsg.isAnonymous ? "an anonymous listener" : userMsg.displayName;
    if (userMsg.isRecording) {
      userPrompt = `\n\nA listener just chimed in with a voice note. ${who} sent an audio message. Acknowledge it naturally and respond to what they might have said — keep it open, curious, warm.`;
    } else {
      userPrompt = `\n\nA listener just messaged the show. ${who} says: "${userMsg.text}"\n\nRespond directly to this listener. Both hosts react. Natural, warm, real.`;
    }
  }

  const messages = [
    { role: "system" as const, content: SHOW_SYSTEM },
    {
      role: "user" as const,
      content: `Recent show context:\n${context || "(show just started)"}\n${userPrompt}\n\nContinue the show naturally. Write the next 3-5 lines.`,
    },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 400,
      messages,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const lines = raw
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.startsWith("VELVET:") || l.startsWith("GRAVEL:"));

    for (const line of lines) {
      const isVelvet = line.startsWith("VELVET:");
      const text = line.replace(/^(VELVET|GRAVEL):\s*/, "").trim();
      if (!text) continue;

      const msg: LiveMessage = {
        id: randomUUID(),
        host: isVelvet ? "velvet" : "gravel",
        text,
        timestamp: Date.now(),
        ...(userMsg ? { pendingUserMsg: userMsg } : {}),
      };
      broadcast(msg);

      // Brief pause between lines — just enough for natural breath
      await new Promise(r => setTimeout(r, 350));
    }
  } catch (err) {
    console.error("[Podcast] Generation error:", err);
  } finally {
    isGenerating = false;
    scheduleNext();
  }
}

function scheduleNext() {
  if (autoGenTimer) clearTimeout(autoGenTimer);
  if (sseClients.size === 0) return; // nobody listening

  const delay = pendingUserMessages.length > 0
    ? 2000  // quick response if someone messaged
    : 28000 + Math.random() * 20000; // 28-48s between organic segments

  autoGenTimer = setTimeout(async () => {
    const nextUser = pendingUserMessages.shift();
    await generateSegment(nextUser);
  }, delay);
}

// ── Routes ───────────────────────────────────────────────────────────────────

// SSE — live feed
router.get("/podcast/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  sseClients.add(res);

  // Send history on connect
  res.write(`data: ${JSON.stringify({ type: "history", messages: liveMessages.slice(-30) })}\n\n`);

  // Kick off the show if nobody was listening before
  if (sseClients.size === 1 && !isGenerating) {
    generateSegment();
  } else {
    scheduleNext();
  }

  req.on("close", () => {
    sseClients.delete(res);
    if (sseClients.size === 0 && autoGenTimer) {
      clearTimeout(autoGenTimer);
      autoGenTimer = null;
    }
  });
});

// Recent history (for page load before SSE connects)
router.get("/podcast/history", (_req, res) => {
  res.json(liveMessages.slice(-30));
});

// User sends a text message to the hosts
router.post("/podcast/message", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { text, isAnonymous } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Message required" });

  const user = req.user as any;
  const displayName = isAnonymous ? "Anonymous" : (user.username || user.firstName || "A listener");

  const userMsg: LiveMessage = {
    id: randomUUID(),
    host: "user",
    text: text.trim().slice(0, 280),
    timestamp: Date.now(),
    displayName,
    isAnonymous: !!isAnonymous,
  };
  broadcast(userMsg);

  const pending: PendingUser = {
    id: userMsg.id,
    text: text.trim().slice(0, 280),
    displayName,
    isAnonymous: !!isAnonymous,
    isRecording: false,
  };
  pendingUserMessages.push(pending);
  scheduleNext();

  res.json({ success: true, id: userMsg.id });
});

// User sends a voice note (base64 webm blob metadata)
router.post("/podcast/chime", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { isAnonymous } = req.body;
  const user = req.user as any;
  const displayName = isAnonymous ? "Anonymous" : (user.username || user.firstName || "A listener");

  const userMsg: LiveMessage = {
    id: randomUUID(),
    host: "user",
    text: "🎙️ sent a voice note to the show",
    timestamp: Date.now(),
    displayName,
    isAnonymous: !!isAnonymous,
    isRecording: true,
  };
  broadcast(userMsg);

  const pending: PendingUser = {
    id: userMsg.id,
    text: "",
    displayName,
    isAnonymous: !!isAnonymous,
    isRecording: true,
  };
  pendingUserMessages.push(pending);
  scheduleNext();

  res.json({ success: true, id: userMsg.id });
});

// TTS for podcast hosts — gpt-audio via chat completions (proxy-compatible)
router.post("/podcast/tts", async (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
  const { text, host } = req.body;
  if (!text || !host) return res.status(400).json({ error: "text and host required" });

  const voice = host === "velvet" ? VELVET_VOICE : GRAVEL_VOICE;
  const clean = String(text).slice(0, 500).trim();

  try {
    const buffer = await textToSpeech(clean, voice, "mp3");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buffer);
  } catch (err: any) {
    console.error("[Podcast/TTS] Error:", err?.message || err);
    res.status(500).json({ error: err?.message || "TTS failed" });
  }
});

export default router;
