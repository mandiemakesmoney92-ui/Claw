import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { Ghost, Trash2, Plus, Loader2, Lock, Sparkles } from "lucide-react";
import { useRingy } from "@/contexts/RingyContext";
import { useSEO } from "@/hooks/useSEO";
import Layout from "@/components/Layout";

interface GhostLetter {
  id: string;
  title: string;
  toName: string | null;
  content: string;
  isAnonymous?: boolean;
  soulzEarned: number;
  isFirstLetter?: boolean;
  createdAt: string;
  ageDays: number;
  isResurfaceable: boolean;
  surfacedAt: string | null;
}

export default function GhostLettersPage() {
  useSEO({
    title: "Ghost Letters — Write the Things You'll Never Send | CLAW",
    description:
      "Write unsent letters to people, places, and versions of yourself on CLAW. Ghost Letters are private, encrypted, and yours alone. Say what could never be delivered. Earn SOULZ on your first letter.",
    canonical: "/ghost-letters",
    keywords:
      "ghost letters, unsent letters app, write unsent letter, emotional journaling, CLAW ghost letters, private letters",
  });
  const { user } = useAuth();
  const { speak } = useRingy();
  const [letters, setLetters] = useState<GhostLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [toName, setToName] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLetters = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ghost-letters", { credentials: "include" });
      if (res.ok) setLetters(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchLetters();
  }, [user]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/ghost-letters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          toName: toName.trim() || "the void",
          content: content.trim(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.isFirstLetter && data.soulzEarned > 0) {
          setSubmitMsg(`+${data.soulzEarned} SOULZ awarded for your first ghost letter.`);
          speak("first letter. that one counts for something.", "normal");
        } else {
          setSubmitMsg("letter sealed and kept.");
          speak("it's sealed. no one else will read this.", "normal");
        }
        setTitle(""); setToName(""); setContent("");
        setComposing(false);
        fetchLetters();
        setTimeout(() => setSubmitMsg(null), 5000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/ghost-letters/${id}`, { method: "DELETE", credentials: "include" });
      setLetters(prev => prev.filter(l => l.id !== id));
      if (expandedId === id) setExpandedId(null);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Ghost className="w-7 h-7 text-violet-400" />
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Ghost Letters</h1>
              <p className="text-xs text-muted-foreground">unsent. private. yours.</p>
            </div>
          </div>
          {!composing && (
            <button
              onClick={() => { setComposing(true); speak("who are you writing to tonight.", "normal"); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium hover:bg-violet-500/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> Write One
            </button>
          )}
        </div>

        <p className="text-sm text-muted-foreground/70 mb-8 leading-relaxed">
          things you could never send. letters to people who won't read them, to past versions of yourself, to anyone. sealed and kept here. your first letter earns <span className="text-violet-400">10 SOULZ</span>.
        </p>

        {composing && (
          <div className="bg-card border border-violet-500/20 rounded-2xl p-5 mb-6 shadow-lg shadow-violet-900/20">
            <div className="text-xs text-violet-400 font-medium mb-4 uppercase tracking-widest">new ghost letter</div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="what is this letter called?"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To</label>
                <input
                  value={toName}
                  onChange={e => setToName(e.target.value)}
                  placeholder="who is this for? (optional — 'the void' if blank)"
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-violet-400/60"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Letter</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="say what you never said..."
                  rows={8}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-violet-400/60"
                />
                <div className="text-[10px] text-muted-foreground/50 mt-1 text-right">{content.length} characters</div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim() || !content.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 disabled:opacity-50 transition-colors"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Seal & Keep
              </button>
              <button
                onClick={() => { setComposing(false); setTitle(""); setToName(""); setContent(""); }}
                className="px-4 py-2 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        {submitMsg && (
          <div className="mb-4 flex items-center gap-2 text-sm text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-xl px-4 py-3">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            {submitMsg}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : letters.length === 0 ? (
          <div className="text-center py-20">
            <Ghost className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">no letters yet.</p>
            <p className="text-muted-foreground/50 text-xs mt-1">the things you never sent deserve a place too.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {letters.map(letter => {
              const aged = letter.ageDays >= 30;
              const isExpanded = expandedId === letter.id;
              return (
                <div
                  key={letter.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all ${aged ? "border-amber-400/30 shadow-sm shadow-amber-900/20" : "border-border"}`}
                >
                  <button
                    className="w-full text-left px-4 py-4 flex items-start justify-between gap-3"
                    onClick={() => setExpandedId(isExpanded ? null : letter.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-foreground text-sm">{letter.title}</span>
                        {aged && (
                          <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                            <Sparkles className="w-2.5 h-2.5" /> Aged {letter.ageDays}d
                          </span>
                        )}
                        {letter.isResurfaceable && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                            resurfaceable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        To: <span className="text-foreground/70">{letter.toName || "the void"}</span>
                        {" · "}{new Date(letter.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(letter.id); }}
                      disabled={deletingId === letter.id}
                      className="flex-shrink-0 text-muted-foreground hover:text-red-400 transition-colors p-1"
                    >
                      {deletingId === letter.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50">
                      <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap pt-3">
                        {letter.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
