import { useState, useRef, useEffect } from "react";
import { useGetReceivedConfessions, useSendConfession, getGetReceivedConfessionsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Heart, Inbox, Send, Loader2, Eye, EyeOff, Lock, Search, X } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

function UserSearch({ onSelect }: { onSelect: (id: string, name: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
        const data = await res.json();
        setResults(Array.isArray(data) ? data : []);
      } finally {
        setSearching(false);
      }
    }, 300);
  };

  const pick = (u: any) => {
    const name = u.displayName || u.username || u.id;
    setSelected({ id: u.id, name });
    onSelect(u.id, name);
    setQuery("");
    setResults([]);
  };

  const clear = () => {
    setSelected(null);
    onSelect("", "");
    setQuery("");
    setResults([]);
  };

  return (
    <div className="relative mb-3">
      {selected ? (
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted border border-accent/30 rounded-lg">
          <div>
            <span className="text-xs text-muted-foreground block">Sending to</span>
            <span className="text-sm font-medium text-accent">{selected.name}</span>
          </div>
          <button onClick={clear} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={query}
              onChange={e => search(e.target.value)}
              placeholder="Search for a person to confess to..."
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
          {results.length > 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
              {results.map(u => (
                <button
                  key={u.id}
                  onClick={() => pick(u)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                      {(u.displayName || u.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-foreground">{u.displayName || u.username}</div>
                    {u.displayName && u.username && (
                      <div className="text-xs text-muted-foreground">@{u.username}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {query.trim() && !searching && results.length === 0 && (
            <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground shadow-xl">
              No one found. Leave blank to send globally.
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Confessions() {
  useSEO({
    title: "Anonymous Confessions — Send Secrets Without a Name | CLAW",
    description:
      "CLAW's anonymous confession platform lets you speak your truth without revealing your identity. Send confessions, receive them, and never worry about traces. Real humans only — AI moderated.",
    canonical: "/confessions",
  });
  const [tab, setTab] = useState<"received" | "send">("received");
  const [targetId, setTargetId] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const qc = useQueryClient();
  const { data: received, isLoading: loadingReceived } = useGetReceivedConfessions();
  const sendConfession = useSendConfession();

  const handleSend = () => {
    if (!content.trim()) return;
    sendConfession.mutate(
      { data: { targetUserId: targetId || undefined, content, isAnonymous } },
      {
        onSuccess: () => {
          setContent("");
          setTargetId("");
          qc.invalidateQueries({ queryKey: getGetReceivedConfessionsQueryKey() });
        }
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="w-6 h-6 text-accent" />
          <h2 className="text-2xl font-serif font-bold text-foreground">Confessions</h2>
        </div>
        <p className="text-muted-foreground text-sm mb-6 italic">Say what you can't say to their face</p>

        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 border border-border">
          <button
            onClick={() => setTab("received")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "received" ? "bg-card text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Inbox className="w-4 h-4" />
            Received
          </button>
          <button
            onClick={() => setTab("send")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "send" ? "bg-card text-primary shadow-sm border border-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>

        {tab === "send" && (
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-serif text-primary mb-4">Write a confession</h3>
            <UserSearch onSelect={(id) => setTargetId(id)} />
            {!targetId && (
              <p className="text-xs text-muted-foreground mb-3 italic">No target selected — confession goes to the global pool</p>
            )}
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Type your confession... be honest."
              rows={4}
              className="w-full bg-muted border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none text-sm mb-3"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isAnonymous} onChange={e => setIsAnonymous(e.target.checked)} className="accent-primary" />
                {isAnonymous ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-accent" />}
                <span className="text-xs text-muted-foreground">{isAnonymous ? "Anonymous" : "Identified"}</span>
              </label>
              <button
                onClick={handleSend}
                disabled={!content.trim() || sendConfession.isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-primary disabled:opacity-50 transition-colors"
              >
                <Lock className="w-4 h-4" />
                {sendConfession.isPending ? "Sending..." : "Send in secret"}
              </button>
            </div>
          </div>
        )}

        {tab === "received" && (
          <div>
            {loadingReceived ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : !received?.length ? (
              <div className="text-center py-16 text-muted-foreground">
                <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="font-serif text-lg">No confessions yet</p>
                <p className="text-sm mt-2">Someone will speak eventually.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {received.map(c => (
                  <div key={c.id} className="bg-card border border-primary/20 rounded-xl p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {c.isAnonymous ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-accent" />}
                        <span className="text-xs text-muted-foreground font-medium">
                          {c.isAnonymous ? "Anonymous" : "Identified"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-foreground italic leading-relaxed">"{c.content}"</p>
                    {!c.isAnonymous && (c as any).sender && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        From: <span className="text-primary">{(c as any).sender?.displayName}</span>
                      </div>
                    )}
                    {c.isAnonymous && (
                      <div className="mt-3 text-xs text-muted-foreground italic">
                        From: a ghost
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
