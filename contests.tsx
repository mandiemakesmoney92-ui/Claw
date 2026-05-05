import { useState, useRef, useEffect } from "react";
import { useGetContests, useSubmitContestEntry, getGetContestsQueryKey } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Trophy, Loader2, Calendar, ChevronDown, ChevronUp, Send, Plus, Settings, Shuffle, Crown, X, ChevronLeft, Users } from "lucide-react";

// ---- Winner Spin Wheel ----
function WinnerWheel({ entries, onSelectWinner }: { entries: any[]; onSelectWinner: (entry: any) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<any | null>(null);
  const [angle, setAngle] = useState(0);
  const animRef = useRef<number | null>(null);

  const colors = [
    "#7c3aed", "#a855f7", "#6d28d9", "#9333ea",
    "#5b21b6", "#8b5cf6", "#4c1d95", "#c084fc",
  ];

  useEffect(() => {
    drawWheel(angle);
  }, [entries, angle]);

  const drawWheel = (currentAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !entries.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 8;
    const slice = (2 * Math.PI) / entries.length;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    entries.forEach((e, i) => {
      const start = currentAngle + i * slice;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = colors[i % colors.length];
      ctx.fill();
      ctx.strokeStyle = "#0a0a12";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + slice / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.min(12, 90 / entries.length)}px sans-serif`;
      const label = (e.author?.displayName || e.author?.username || "?").slice(0, 12);
      ctx.fillText(label, r - 10, 4);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#0a0a12";
    ctx.fill();
    ctx.strokeStyle = "#7c3aed";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pointer
    ctx.beginPath();
    ctx.moveTo(cx + r + 4, cy);
    ctx.lineTo(cx + r - 16, cy - 10);
    ctx.lineTo(cx + r - 16, cy + 10);
    ctx.closePath();
    ctx.fillStyle = "#facc15";
    ctx.fill();
  };

  const spin = () => {
    if (spinning || !entries.length) return;
    setWinner(null);
    setSpinning(true);

    const totalSpins = 6 + Math.random() * 6;
    const totalAngle = totalSpins * 2 * Math.PI;
    const duration = 4000 + Math.random() * 2000;
    const start = performance.now();
    const startAngle = angle;

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const currentAngle = startAngle + totalAngle * easeOut(progress);
      setAngle(currentAngle);
      drawWheel(currentAngle);
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        const slice = (2 * Math.PI) / entries.length;
        // Pointer at angle=0 on the right → reverse lookup
        const normalised = ((currentAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pointed = (2 * Math.PI - normalised) % (2 * Math.PI);
        const idx = Math.floor(pointed / slice) % entries.length;
        const picked = entries[idx];
        setWinner(picked);
      }
    };
    animRef.current = requestAnimationFrame(animate);
  };

  if (!entries.length) return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Users className="w-10 h-10 mb-3 opacity-20" />
      <p className="text-sm">No entries yet — can't spin the wheel</p>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <canvas ref={canvasRef} width={280} height={280} className="rounded-full" />
      </div>
      {winner && (
        <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-6 py-4 text-center w-full">
          <Crown className="w-6 h-6 text-yellow-400 mx-auto mb-1" />
          <p className="text-xs text-yellow-400/70 uppercase tracking-wider mb-1">Winner</p>
          <p className="text-lg font-serif font-bold text-yellow-300">
            {winner.author?.displayName || winner.author?.username || "Unknown"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">"{winner.content.slice(0, 80)}{winner.content.length > 80 ? "..." : ""}"</p>
          <button
            onClick={() => onSelectWinner(winner)}
            className="mt-3 px-6 py-2 bg-yellow-400 text-black text-sm font-bold rounded-xl hover:bg-yellow-300 transition-colors"
          >
            Confirm Winner + Close Contest
          </button>
        </div>
      )}
      <button
        onClick={spin}
        disabled={spinning}
        className="flex items-center gap-2 px-8 py-3 bg-primary hover:bg-accent text-white font-bold rounded-2xl text-sm disabled:opacity-50 transition-colors shadow-lg shadow-primary/30"
      >
        {spinning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
        {spinning ? "Spinning..." : "Spin to Pick Winner"}
      </button>
    </div>
  );
}

// ---- Create Contest Form ----
function CreateContestForm({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ title: "", description: "", contestType: "writing", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    if (!form.title || !form.description || !form.endDate) { setErr("All fields required."); return; }
    setSaving(true);
    setErr("");
    try {
      const r = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      if (!r.ok) throw new Error();
      onCreated();
    } catch {
      setErr("Failed to create contest.");
    } finally {
      setSaving(false);
    }
  };

  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  return (
    <div className="bg-card border border-yellow-400/20 rounded-2xl p-5 space-y-4">
      <h3 className="font-serif text-yellow-400 text-lg">New Contest</h3>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Title</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Give it a name that cuts"
          className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-yellow-400/50 transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Description / Prompt</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          placeholder="What are people competing on?"
          className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-yellow-400/50 transition-colors resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">Type</label>
          <select
            value={form.contestType}
            onChange={e => setForm(f => ({ ...f, contestType: e.target.value }))}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-yellow-400/50 transition-colors"
          >
            <option value="writing">Writing</option>
            <option value="drawing">Drawing</option>
            <option value="photo">Photo</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5 uppercase tracking-wide font-medium">End Date</label>
          <input
            type="date"
            min={tomorrow}
            value={form.endDate}
            onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
            className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-yellow-400/50 transition-colors"
          />
        </div>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-yellow-400 text-black font-bold rounded-xl text-sm hover:bg-yellow-300 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Launch Contest
      </button>
    </div>
  );
}

// ---- Contest Admin Detail (entries + wheel) ----
function ContestAdmin({ contest, onBack, onWinnerPicked }: { contest: any; onBack: () => void; onWinnerPicked: () => void }) {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWheel, setShowWheel] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [togglePending, setTogglePending] = useState(false);

  useEffect(() => {
    fetch(`/api/contests/${contest.id}/entries`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [contest.id]);

  const handleConfirmWinner = async (entry: any) => {
    setConfirming(true);
    try {
      await fetch(`/api/contests/${contest.id}/winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ winnerId: entry.author?.id }),
      });
      onWinnerPicked();
    } finally {
      setConfirming(false);
    }
  };

  const handleToggle = async () => {
    setTogglePending(true);
    try {
      await fetch(`/api/contests/${contest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !contest.isActive }),
      });
      onWinnerPicked();
    } finally {
      setTogglePending(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to list
      </button>
      <div className="bg-card border border-yellow-400/20 rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-foreground">{contest.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{contest.description}</p>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${contest.isActive ? "bg-yellow-400/15 text-yellow-400" : "bg-muted text-muted-foreground"}`}>
            {contest.isActive ? "Live" : "Ended"}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-muted-foreground">{entries.length} entries</span>
          <button
            onClick={handleToggle}
            disabled={togglePending}
            className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${contest.isActive ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-green-500/30 text-green-400 hover:bg-green-500/10"}`}
          >
            {togglePending ? "..." : contest.isActive ? "Close Contest" : "Reopen Contest"}
          </button>
          {entries.length > 0 && (
            <button
              onClick={() => setShowWheel(!showWheel)}
              className="text-xs px-3 py-1.5 rounded-lg border border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10 font-medium transition-colors flex items-center gap-1"
            >
              <Shuffle className="w-3 h-3" />
              {showWheel ? "Hide Wheel" : "Spin Wheel"}
            </button>
          )}
        </div>
      </div>

      {showWheel && (
        <div className="bg-card border border-yellow-400/15 rounded-2xl p-5 mb-4">
          <WinnerWheel entries={entries} onSelectWinner={handleConfirmWinner} />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : entries.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">No entries yet.</div>
      ) : (
        <div className="space-y-3">
          {entries.map((e, i) => (
            <div key={e.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                {e.author?.avatarUrl ? (
                  <img src={e.author.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {(e.author?.displayName || "?")[0]}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground">{e.author?.displayName || e.author?.username}</span>
                <span className="text-xs text-muted-foreground ml-auto">#{i + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Main Contests Page ----
export default function Contests() {
  useSEO({
    title: "Truth Contests — Compete for Most Authentic Voice | CLAW",
    description:
      "CLAW community contests reward honest voices, not popular ones. Submit your truth, vote on others, and win GEMZ rewards. New contests weekly — no algorithm decides the winner.",
    canonical: "/contests",
  });
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"browse" | "manage">("browse");
  const [showCreate, setShowCreate] = useState(false);
  const [adminContest, setAdminContest] = useState<any | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());
  const [allContests, setAllContests] = useState<any[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  const { data: contests, isLoading } = useGetContests();
  const enterContest = useSubmitContestEntry();

  const loadAllContests = () => {
    setAllLoading(true);
    fetch("/api/contests?all=1", { credentials: "include" })
      .then(r => r.json())
      .then(d => { setAllContests(Array.isArray(d) ? d : []); setAllLoading(false); })
      .catch(() => setAllLoading(false));
  };

  useEffect(() => {
    if (tab === "manage" && user) loadAllContests();
  }, [tab, user]);

  const handleEnter = (contestId: string) => {
    const content = entries[contestId]?.trim();
    if (!content) return;
    enterContest.mutate(
      { contestId, data: { content } },
      {
        onSuccess: () => {
          setSubmitted(prev => new Set([...prev, contestId]));
          setExpandedId(null);
          qc.invalidateQueries({ queryKey: getGetContestsQueryKey() });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 pb-16">
        <div className="flex items-center gap-3 mb-1">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Contests</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-5">Compete. Climb. Claim your throne.</p>

        {user && (
          <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 border border-border">
            <button
              onClick={() => setTab("browse")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "browse" ? "bg-card text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Trophy className="w-4 h-4" />
              Browse
            </button>
            <button
              onClick={() => setTab("manage")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "manage" ? "bg-card text-yellow-400 shadow-sm border border-yellow-400/20" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Settings className="w-4 h-4" />
              Manage
            </button>
          </div>
        )}

        {/* ---- BROWSE TAB ---- */}
        {tab === "browse" && (
          <>
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !contests?.length ? (
              <div className="text-center py-20 text-muted-foreground">
                <Trophy className="w-14 h-14 mx-auto mb-5 opacity-10" />
                <p className="font-serif text-xl mb-2">No active contests</p>
                <p className="text-sm">The next battle is being prepared. Check back soon.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contests.map((c: any) => {
                  const endDate = c.endDate ? new Date(c.endDate) : null;
                  const isExpanded = expandedId === c.id;
                  const hasSubmitted = submitted.has(c.id);
                  return (
                    <div key={c.id} className="bg-card border border-yellow-400/20 rounded-2xl overflow-hidden shadow-lg shadow-yellow-400/5">
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="flex w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-yellow-400/15 text-yellow-400">Live</span>
                              {hasSubmitted && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold uppercase tracking-wider">Entered</span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider font-medium">{c.contestType}</span>
                            </div>
                            <h3 className="font-serif text-lg font-semibold text-foreground">{c.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{c.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-3">
                            {endDate && (
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                Ends {endDate.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground">{c.entryCount} entries</span>
                          </div>
                          {user && !hasSubmitted && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : c.id)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-400/15 border border-yellow-400/30 text-yellow-400 text-xs font-semibold hover:bg-yellow-400/25 transition-colors"
                            >
                              Enter {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {!user && (
                            <span className="text-xs text-muted-foreground italic">Sign in to enter</span>
                          )}
                        </div>
                      </div>
                      {isExpanded && !hasSubmitted && (
                        <div className="border-t border-yellow-400/15 p-5 bg-yellow-400/[0.03]">
                          <label className="block text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Your Entry</label>
                          <textarea
                            value={entries[c.id] || ""}
                            onChange={e => setEntries(prev => ({ ...prev, [c.id]: e.target.value }))}
                            rows={4}
                            placeholder="Write your submission here. Make it count."
                            className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-yellow-400/50 resize-none transition-colors placeholder:text-muted-foreground/50"
                          />
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-muted-foreground">{(entries[c.id] || "").length} characters</span>
                            <button
                              onClick={() => handleEnter(c.id)}
                              disabled={!entries[c.id]?.trim() || enterContest.isPending}
                              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300 disabled:opacity-40 transition-colors"
                            >
                              {enterContest.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              Submit Entry
                            </button>
                          </div>
                        </div>
                      )}
                      {c.winner && (
                        <div className="border-t border-yellow-400/15 px-5 py-3 bg-yellow-400/5 flex items-center gap-2">
                          <Crown className="w-4 h-4 text-yellow-400" />
                          <span className="text-xs text-yellow-300 font-medium">Winner: {c.winner.displayName || c.winner.username}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ---- MANAGE TAB ---- */}
        {tab === "manage" && user && (
          <div>
            {adminContest ? (
              <ContestAdmin
                contest={adminContest}
                onBack={() => { setAdminContest(null); loadAllContests(); }}
                onWinnerPicked={() => { setAdminContest(null); loadAllContests(); }}
              />
            ) : (
              <>
                {showCreate ? (
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-serif text-foreground">Create Contest</h3>
                      <button onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                    </div>
                    <CreateContestForm onCreated={() => { setShowCreate(false); loadAllContests(); }} />
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 mb-5 rounded-2xl border border-dashed border-yellow-400/30 text-yellow-400 text-sm font-medium hover:bg-yellow-400/5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Contest
                  </button>
                )}

                {allLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : allContests.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No contests yet. Create one above.</div>
                ) : (
                  <div className="space-y-3">
                    {allContests.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setAdminContest(c)}
                        className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-yellow-400/30 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.isActive ? "bg-yellow-400 animate-pulse" : "bg-muted-foreground"}`} />
                            <span className="font-serif font-semibold text-foreground group-hover:text-yellow-400 transition-colors">{c.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{c.entryCount} entries</span>
                            <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{c.description}</p>
                        {c.winner && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Crown className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-yellow-400">Winner: {c.winner.displayName}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
