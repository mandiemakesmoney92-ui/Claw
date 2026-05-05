import { useState, useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";
import { useLocation } from "wouter";
import { ChevronLeft, Megaphone, Search, Send } from "lucide-react";

interface Shoutout {
  id: number;
  fromUserId: string;
  toUserId: string;
  message: string;
  isPublic: boolean;
  createdAt: string;
}

interface UserResult {
  id: string;
  username: string;
  profilePictureUrl?: string | null;
}

function timeAgo(dateString: string) {
  const diff = (Date.now() - new Date(dateString).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ShoutoutsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [shoutouts, setShoutouts] = useState<Shoutout[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserResult | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch("/api/shoutouts", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setShoutouts(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetch(`/api/users/search?q=${encodeURIComponent(search)}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setSearchResults(Array.isArray(d) ? d.slice(0, 5) : []))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const sendShoutout = async () => {
    if (!selectedUser || !message.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/shoutouts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: selectedUser.id, message: message.trim() }),
      });
      if (res.ok) {
        setSent(true);
        setMessage("");
        setSelectedUser(null);
        setSearch("");
        const updated = await fetch("/api/shoutouts", { credentials: "include" }).then(r => r.json());
        setShoutouts(Array.isArray(updated) ? updated : []);
      }
    } catch {}
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-[#060410] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#060410]/95 border-b border-purple-900/30 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/feed")} className="text-purple-400 hover:text-purple-300 transition-colors">
            <ChevronLeft size={22} />
          </button>
          <Megaphone size={16} className="text-purple-400" />
          <h1 className="text-white font-serif text-lg font-semibold">Shoutouts</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {user && (
          <div className="bg-white/5 border border-purple-900/30 rounded-2xl p-5 flex flex-col gap-4">
            <p className="text-white/70 text-sm font-medium">Give someone a shoutout</p>

            {!selectedUser ? (
              <div className="relative">
                <div className="flex items-center gap-2 bg-black/30 border border-white/10 rounded-xl px-3 py-2">
                  <Search size={14} className="text-purple-400 shrink-0" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by username..."
                    className="flex-1 bg-transparent text-white text-sm placeholder-white/20 focus:outline-none"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[#0d0d1a] border border-purple-900/40 rounded-xl overflow-hidden z-10 shadow-xl">
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => { setSelectedUser(u); setSearch(""); setSearchResults([]); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-purple-900/50 flex items-center justify-center overflow-hidden shrink-0">
                          {u.profilePictureUrl ? (
                            <img src={u.profilePictureUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-purple-300 text-xs">✦</span>
                          )}
                        </div>
                        <span className="text-white/80 text-sm">@{u.username}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-purple-900/20 border border-purple-700/30 rounded-xl px-3 py-2">
                <span className="text-white/80 text-sm">Shouting out: <span className="text-purple-300 font-medium">@{selectedUser.username}</span></span>
                <button onClick={() => setSelectedUser(null)} className="text-white/30 hover:text-white/70 ml-auto text-xs">change</button>
              </div>
            )}

            {selectedUser && (
              <div className="flex gap-2">
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="What do you want people to know about them?"
                  rows={2}
                  maxLength={280}
                  className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-sm placeholder-white/20 focus:outline-none focus:border-purple-500/60 resize-none transition-colors"
                />
                <button
                  onClick={sendShoutout}
                  disabled={sending || !message.trim()}
                  className="bg-purple-700/60 hover:bg-purple-600/70 disabled:opacity-40 text-white p-3 rounded-xl transition-colors shrink-0"
                >
                  <Send size={16} />
                </button>
              </div>
            )}

            {sent && (
              <p className="text-emerald-400/80 text-xs text-center">Shoutout sent. ✓</p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <p className="text-white/30 text-xs uppercase tracking-widest">Recent Shoutouts</p>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
          ) : shoutouts.length === 0 ? (
            <div className="text-center py-16 text-white/20">
              <Megaphone size={36} className="mx-auto mb-4 opacity-30" />
              <p className="text-sm">No shoutouts yet. Be the first.</p>
            </div>
          ) : (
            shoutouts.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center shrink-0 text-purple-300 text-sm">
                  📣
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white/80 text-sm leading-relaxed">"{s.message}"</p>
                  <p className="text-white/30 text-xs mt-1">{timeAgo(s.createdAt)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
