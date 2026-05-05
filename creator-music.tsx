import { useState, useRef, useEffect, useCallback } from "react";
import { Music, Upload, Play, Pause, Save, Send, Loader2, SkipBack, SkipForward, Volume2, Repeat, Zap, Activity } from "lucide-react";
import { useUpdateMyProfile } from "@workspace/api-client-react";

interface MusicStudioProps {
  onPostCreated?: () => void;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const PRESETS = [
  { name: "Raw",      bass: 3,  mid: 0,  treble: 0, reverb: false, bassBoost: false },
  { name: "Bass Hit", bass: 8,  mid: -2, treble: -1, reverb: false, bassBoost: true },
  { name: "Ambient",  bass: 2,  mid: -1, treble: 3,  reverb: true,  bassBoost: false },
  { name: "Lo-Fi",    bass: 4,  mid: -3, treble: -4, reverb: true,  bassBoost: false },
  { name: "Crisp",    bass: -2, mid: 1,  treble: 6,  reverb: false, bassBoost: false },
  { name: "Void",     bass: 6,  mid: -5, treble: -6, reverb: true,  bassBoost: true },
];

export default function MusicStudio({ onPostCreated }: MusicStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const midFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const bassBoostNodeRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const delayFeedbackRef = useRef<GainNode | null>(null);
  const delayDryRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const animRef = useRef<number>(0);
  const tapTimesRef = useRef<number[]>([]);
  const updateProfile = useUpdateMyProfile();

  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [fadeIn, setFadeIn] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [copyrightAgreed, setCopyrightAgreed] = useState(false);
  const [loop, setLoop] = useState(false);
  const [bassBoost, setBassBoost] = useState(false);
  const [reverb, setReverb] = useState(false);
  const [bass, setBass] = useState(0);
  const [mid, setMid] = useState(0);
  const [treble, setTreble] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "eq" | "fx">("edit");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("audio/")) { alert("Audio files only"); return; }
    setFile(f);
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setSaved(null);
    setCopyrightAgreed(false);
    setBpm(null);
    tapTimesRef.current = [];
    if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; }
    analyserRef.current = null;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;
    audio.volume = volume;
    audio.loop = loop;
    const onLoaded = () => { setDuration(audio.duration); setTrimEnd(audio.duration); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onEnded = () => { setPlaying(false); audio.currentTime = trimStart; };
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
    };
  }, [audioUrl, trimStart, loop]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { if (audioRef.current) audioRef.current.loop = loop; }, [loop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !playing) return;
    if (currentTime >= trimEnd) { audio.pause(); audio.currentTime = trimStart; setPlaying(false); }
  }, [currentTime, trimEnd, trimStart, playing]);

  useEffect(() => {
    if (bassFilterRef.current) bassFilterRef.current.gain.value = bass;
  }, [bass]);
  useEffect(() => {
    if (midFilterRef.current) midFilterRef.current.gain.value = mid;
  }, [mid]);
  useEffect(() => {
    if (trebleFilterRef.current) trebleFilterRef.current.gain.value = treble;
  }, [treble]);
  useEffect(() => {
    if (bassBoostNodeRef.current) bassBoostNodeRef.current.gain.value = bassBoost ? 8 : 0;
  }, [bassBoost]);
  useEffect(() => {
    if (delayFeedbackRef.current) delayFeedbackRef.current.gain.value = reverb ? 0.35 : 0;
    if (delayDryRef.current) delayDryRef.current.gain.value = reverb ? 0.7 : 1;
  }, [reverb]);

  const drawBars = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const barCount = 48;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, W, H);
    const barW = (W / barCount) - 1;
    for (let i = 0; i < barCount; i++) {
      const val = data[Math.floor((i / barCount) * data.length)];
      const barH = (val / 255) * H * 0.9;
      const hue = 270 + (i / barCount) * 60;
      const alpha = 0.6 + (val / 255) * 0.4;
      ctx.fillStyle = `hsla(${hue}, 80%, 65%, ${alpha})`;
      const x = i * (barW + 1);
      ctx.fillRect(x, H - barH, barW, barH);
      ctx.fillStyle = `hsla(${hue}, 80%, 90%, ${alpha * 0.4})`;
      ctx.fillRect(x, H - barH - 2, barW, 2);
    }
    animRef.current = requestAnimationFrame(drawBars);
  }, []);

  const buildAudioGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audioCtxRef.current) return;
    const ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    const bassF = ctx.createBiquadFilter(); bassF.type = "lowshelf"; bassF.frequency.value = 200; bassF.gain.value = bass;
    const midF = ctx.createBiquadFilter(); midF.type = "peaking"; midF.frequency.value = 1000; midF.Q.value = 1; midF.gain.value = mid;
    const trebleF = ctx.createBiquadFilter(); trebleF.type = "highshelf"; trebleF.frequency.value = 6000; trebleF.gain.value = treble;
    const bbF = ctx.createBiquadFilter(); bbF.type = "lowshelf"; bbF.frequency.value = 120; bbF.gain.value = bassBoost ? 8 : 0;
    const delay = ctx.createDelay(1.0); delay.delayTime.value = 0.3;
    const feedback = ctx.createGain(); feedback.gain.value = reverb ? 0.35 : 0;
    const dryGain = ctx.createGain(); dryGain.gain.value = reverb ? 0.7 : 1;
    const masterGain = ctx.createGain(); masterGain.gain.value = 1;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 512;

    src.connect(bassF).connect(midF).connect(trebleF).connect(bbF);
    bbF.connect(dryGain);
    bbF.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(masterGain);
    dryGain.connect(masterGain);
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);

    audioCtxRef.current = ctx;
    analyserRef.current = analyser;
    bassFilterRef.current = bassF;
    midFilterRef.current = midF;
    trebleFilterRef.current = trebleF;
    bassBoostNodeRef.current = bbF;
    delayNodeRef.current = delay;
    delayFeedbackRef.current = feedback;
    delayDryRef.current = dryGain;
    masterGainRef.current = masterGain;
  }, [bass, mid, treble, bassBoost, reverb]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      cancelAnimationFrame(animRef.current);
    } else {
      buildAudioGraph();
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
      audio.currentTime = Math.max(trimStart, audio.currentTime < trimStart || audio.currentTime >= trimEnd ? trimStart : audio.currentTime);
      audio.play();
      setPlaying(true);
      drawBars();
    }
  };

  const tapBPM = () => {
    const now = Date.now();
    tapTimesRef.current.push(now);
    if (tapTimesRef.current.length > 6) tapTimesRef.current.shift();
    if (tapTimesRef.current.length >= 2) {
      const intervals = tapTimesRef.current.slice(1).map((t, i) => t - tapTimesRef.current[i]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setBpm(Math.round(60000 / avg));
    }
  };

  const applyPreset = (p: typeof PRESETS[0]) => {
    setBass(p.bass); setMid(p.mid); setTreble(p.treble);
    setReverb(p.reverb); setBassBoost(p.bassBoost);
  };

  const uploadAndSave = async (mode: "profile" | "post") => {
    if (!file) return;
    setUploading(true);
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      const { uploadURL, objectPath } = await metaRes.json();
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      if (mode === "profile") {
        updateProfile.mutate(
          { data: { profileSong: serveUrl, profileSongTitle: title || file.name } as any },
          { onSuccess: () => setSaved("Saved to your profile song!") }
        );
      } else {
        await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: title || `Music: ${file.name}`,
            intentType: "Broadcast",
            intensityLevel: "Soft",
            mediaUrl: serveUrl,
            mediaType: "audio",
          }),
        });
        setSaved("Posted to your feed!");
        onPostCreated?.();
      }
    } catch {
      setSaved("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartPct = duration > 0 ? (trimStart / duration) * 100 : 0;
  const trimEndPct = duration > 0 ? (trimEnd / duration) * 100 : 100;

  const tabs = [
    { key: "edit", label: "Edit" },
    { key: "eq",   label: "EQ" },
    { key: "fx",   label: "FX" },
  ] as const;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-1">
        <Music className="w-5 h-5 text-primary" />
        <h3 className="font-serif font-semibold text-foreground">Music Studio</h3>
        <span className="text-xs text-muted-foreground">Trim · EQ · FX · Loop · BPM</span>
      </div>

      {!file ? (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-primary/30 rounded-xl p-12 text-center hover:border-primary/60 hover:bg-primary/5 transition-all">
            <Music className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Upload an audio track</p>
            <p className="text-xs text-muted-foreground">MP3, WAV, FLAC, OGG — any format</p>
          </div>
          <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
        </label>
      ) : (
        <>
          <audio ref={audioRef} src={audioUrl!} preload="auto" className="hidden" />
          <canvas ref={canvasRef} width={600} height={60} className="w-full rounded-lg bg-muted/50 border border-border" />

          <div className="flex gap-1 p-1 bg-muted/50 border border-border rounded-xl">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === t.key
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === "edit" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-1.5">Track Name</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60"
                  placeholder="Give your track a name..."
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-2">
                  <span>Playback: {formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div className="absolute top-0 h-full bg-primary/40 rounded-full" style={{ left: `${trimStartPct}%`, width: `${trimEndPct - trimStartPct}%` }} />
                  <div className="absolute top-0 h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Trim Start: {formatTime(trimStart)}</label>
                  <input type="range" min={0} max={duration} step={0.1} value={trimStart}
                    onChange={e => setTrimStart(Math.min(Number(e.target.value), trimEnd - 1))}
                    className="w-full accent-primary" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Trim End: {formatTime(trimEnd)}</label>
                  <input type="range" min={0} max={duration} step={0.1} value={trimEnd}
                    onChange={e => setTrimEnd(Math.max(Number(e.target.value), trimStart + 1))}
                    className="w-full accent-primary" />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1.5">
                  <Volume2 className="w-3 h-3" /> Volume: {Math.round(volume * 100)}%
                </label>
                <input type="range" min={0} max={1} step={0.05} value={volume}
                  onChange={e => setVolume(Number(e.target.value))}
                  className="w-full accent-primary" />
              </div>

              <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fadeIn} onChange={e => setFadeIn(e.target.checked)} className="accent-primary" />
                  <span className="text-sm text-muted-foreground">Fade In</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={fadeOut} onChange={e => setFadeOut(e.target.checked)} className="accent-primary" />
                  <span className="text-sm text-muted-foreground">Fade Out</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={loop} onChange={e => setLoop(e.target.checked)} className="accent-primary" />
                  <span className="text-sm text-muted-foreground flex items-center gap-1"><Repeat className="w-3 h-3" /> Loop</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button onClick={() => { const a = audioRef.current; if (a) a.currentTime = trimStart; }}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors">
                  <SkipBack className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={togglePlay}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-accent transition-colors">
                  {playing ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Preview</>}
                </button>
                <button onClick={() => { const a = audioRef.current; if (a) a.currentTime = trimEnd; }}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors">
                  <SkipForward className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">BPM Tap</span>
                  </div>
                  {bpm && (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary font-mono">{bpm}</span>
                      <span className="text-xs text-muted-foreground">BPM</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={tapBPM}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-primary/40 text-primary font-semibold text-sm hover:border-primary/70 hover:bg-primary/10 active:scale-95 transition-all"
                >
                  Tap to the beat →
                </button>
                {bpm && (
                  <p className="text-[10px] text-muted-foreground text-center mt-1.5">Tap 4+ times for accuracy. Keep tapping to update.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === "eq" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-foreground">3-Band EQ</span>
                </div>
                <button
                  onClick={() => { setBass(0); setMid(0); setTreble(0); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-4">
                {[
                  { label: "Bass",   value: bass,   set: setBass,   color: "#e879a0", freq: "200 Hz" },
                  { label: "Mid",    value: mid,    set: setMid,    color: "#9b59b6", freq: "1 kHz" },
                  { label: "Treble", value: treble, set: setTreble, color: "#7c3aed", freq: "6 kHz" },
                ].map(band => (
                  <div key={band.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold" style={{ color: band.color }}>
                        {band.label} <span className="text-muted-foreground font-normal">({band.freq})</span>
                      </label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {band.value > 0 ? "+" : ""}{band.value} dB
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-6">-12</span>
                      <input type="range" min={-12} max={12} step={0.5} value={band.value}
                        onChange={e => band.set(Number(e.target.value))}
                        className="flex-1" style={{ accentColor: band.color }} />
                      <span className="text-xs text-muted-foreground w-6">+12</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Presets</div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESETS.map(p => (
                    <button
                      key={p.name}
                      onClick={() => applyPreset(p)}
                      className="py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "fx" && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Effects</span>
              </div>

              <div className="space-y-3">
                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${bassBoost ? "border-pink-500/50 bg-pink-500/10" : "border-border"}`}>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Bass Boost</div>
                    <div className="text-xs text-muted-foreground">+8dB shelf at 120Hz</div>
                  </div>
                  <button
                    onClick={() => setBassBoost(b => !b)}
                    className={`w-11 h-6 rounded-full border transition-all relative ${bassBoost ? "bg-pink-500 border-pink-400" : "bg-muted border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${bassBoost ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${reverb ? "border-violet-500/50 bg-violet-500/10" : "border-border"}`}>
                  <div>
                    <div className="text-sm font-semibold text-foreground">Echo / Reverb</div>
                    <div className="text-xs text-muted-foreground">300ms delay, 35% feedback</div>
                  </div>
                  <button
                    onClick={() => setReverb(r => !r)}
                    className={`w-11 h-6 rounded-full border transition-all relative ${reverb ? "bg-violet-500 border-violet-400" : "bg-muted border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${reverb ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>

                <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${loop ? "border-primary/50 bg-primary/10" : "border-border"}`}>
                  <div>
                    <div className="text-sm font-semibold text-foreground flex items-center gap-1.5"><Repeat className="w-3.5 h-3.5" /> Loop</div>
                    <div className="text-xs text-muted-foreground">Repeats the trimmed section</div>
                  </div>
                  <button
                    onClick={() => setLoop(l => !l)}
                    className={`w-11 h-6 rounded-full border transition-all relative ${loop ? "bg-primary border-primary/70" : "bg-muted border-border"}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${loop ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              <div className="border border-border rounded-xl p-3">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Quick Presets</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {PRESETS.map(p => (
                    <button key={p.name} onClick={() => { applyPreset(p); setActiveTab("eq"); }}
                      className="py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 text-xs text-muted-foreground hover:text-foreground transition-all">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {saved && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm text-center">{saved}</div>
          )}

          <div className={`rounded-xl border p-4 transition-colors ${copyrightAgreed ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/25 bg-yellow-500/5"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={copyrightAgreed} onChange={e => setCopyrightAgreed(e.target.checked)} className="mt-0.5 accent-primary flex-shrink-0" />
              <span className="text-xs text-white/60 leading-relaxed">
                I certify that I own all rights to this audio or have a valid license to upload, stream, and share it on CLAW. Uploading copyrighted music I don't own may result in account suspension.{" "}
                <a href="/terms#music" className="text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer">Music Policy</a>
              </span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button onClick={() => uploadAndSave("profile")} disabled={uploading || !copyrightAgreed}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/20 text-primary border border-primary/30 text-sm font-medium hover:bg-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Set as Profile Song
            </button>
            <button onClick={() => uploadAndSave("post")} disabled={uploading || !copyrightAgreed}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent/20 text-accent border border-accent/30 text-sm font-medium hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Post to Feed
            </button>
          </div>

          <button onClick={() => { setFile(null); setAudioUrl(null); setPlaying(false); setSaved(null); if (audioCtxRef.current) { audioCtxRef.current.close(); audioCtxRef.current = null; } }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
            Upload different track
          </button>
        </>
      )}
    </div>
  );
}
