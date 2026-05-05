import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { Moon, Sparkles, Lock, Globe, ChevronDown, ChevronUp, Users, Eye, Clock, Send } from "lucide-react";
import { toast } from "sonner";

export default function ShadowWork() {
  useSEO({
    title: "Shadow Work — Daily Self-Reflection Prompts for Authentic Growth | CLAW",
    description:
      "CLAW's Shadow Work delivers daily Jungian self-reflection prompts to help you face your shadow, journal honestly, and earn SOULZ. The only social media that rewards inner work.",
    canonical: "/shadow-work",
    noIndex: false,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const [response, setResponse] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  // Shared Reflection state
  const [sharedRoom, setSharedRoom] = useState<any | null>(null);
  const [sharedResponse, setSharedResponse] = useState("");
  const [joiningShared, setJoiningShared] = useState(false);

  const { data: promptData } = useQuery({
    queryKey: ["shadow-prompt"],
    queryFn: async () => {
      const res = await fetch("/api/shadow-work/prompt", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: myEntries } = useQuery({
    queryKey: ["shadow-work-me"],
    queryFn: async () => {
      const res = await fetch("/api/shadow-work/me", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  const { data: publicEntries } = useQuery({
    queryKey: ["shadow-work-public"],
    queryFn: async () => {
      const res = await fetch("/api/shadow-work/public", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/shadow-work", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptData?.prompt, response, isPublic }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`✨ Shadow Work complete. +${data.soulzEarned} SOULZ earned.`);
      setResponse("");
      qc.invalidateQueries({ queryKey: ["shadow-work-me"] });
      qc.invalidateQueries({ queryKey: ["shadow-work-public"] });
    },
    onError: () => toast.error("Failed to submit. Try again."),
  });

  const joinSharedRoom = async () => {
    if (!user) return;
    setJoiningShared(true);
    try {
      const res = await fetch("/api/shadow-work/shared/join", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setSharedRoom(data.room);
      if (data.alreadyJoined) toast.info("You're already in a shared reflection room.");
    } catch {
      toast.error("Couldn't join a room. Try again.");
    } finally {
      setJoiningShared(false);
    }
  };

  const refreshRoom = async () => {
    if (!sharedRoom) return;
    const res = await fetch(`/api/shadow-work/shared/${sharedRoom.id}`, { credentials: "include" });
    if (res.ok) setSharedRoom(await res.json());
  };

  const submitSharedResponse = async () => {
    if (!sharedRoom || sharedResponse.trim().length < 5) return;
    const res = await fetch(`/api/shadow-work/shared/${sharedRoom.id}/respond`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ response: sharedResponse }),
    });
    if (res.ok) {
      const data = await res.json();
      setSharedResponse("");
      toast.success(data.allResponded ? "✦ All responses in — revealed!" : "✦ Response submitted. Waiting for others...");
      await refreshRoom();
    } else {
      toast.error("Failed to submit. Try again.");
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-500/20 border border-indigo-500/40 mb-4">
            <Moon className="w-10 h-10 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">Shadow Work</h1>
          <p className="text-zinc-400 text-sm">Face the uncomfortable. Earn SOULZ.<br/>Daily prompts to reveal what you hide from yourself.</p>
        </div>

        {/* Today's Prompt */}
        {promptData && (
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/20 border border-indigo-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest">Today's Shadow Prompt</span>
            </div>
            <p className="text-xl font-medium text-white leading-relaxed mb-5">"{promptData.prompt}"</p>

            {user ? (
              <div className="space-y-3">
                <textarea
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                  placeholder="Be honest. No one has to see this..."
                  rows={5}
                  maxLength={2000}
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl p-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <div className="flex items-center justify-between">
                  <button onClick={() => setIsPublic(!isPublic)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                      isPublic ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-zinc-800 border-zinc-700 text-zinc-400"
                    }`}>
                    {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    {isPublic ? "Public" : "Private"}
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-600">{response.length}/2000</span>
                    <button
                      onClick={() => submitMutation.mutate()}
                      disabled={response.length < 10 || submitMutation.isPending}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      {submitMutation.isPending ? "Submitting..." : "Submit + Earn 10 SOULZ"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">Sign in to respond and earn SOULZ.</p>
            )}
          </div>
        )}

        {/* My Entries */}
        {user && myEntries && myEntries.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Lock className="w-4 h-4 text-zinc-400" /> My Shadows
            </h2>
            {myEntries.map((entry: any) => (
              <div key={entry.id} className="bg-zinc-900/60 border border-zinc-700/60 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                  className="w-full p-4 flex items-start justify-between text-left gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-indigo-400 mb-1">{new Date(entry.createdAt).toLocaleDateString()}</p>
                    <p className="text-sm text-zinc-300 line-clamp-2">"{entry.prompt}"</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {entry.isPublic ? <Globe className="w-3.5 h-3.5 text-zinc-500" /> : <Lock className="w-3.5 h-3.5 text-zinc-500" />}
                    {expanded === entry.id ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
                  </div>
                </button>
                {expanded === entry.id && (
                  <div className="px-4 pb-4 border-t border-zinc-800">
                    <p className="text-sm text-zinc-300 mt-3 whitespace-pre-wrap">{entry.response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Public Shadows */}
        {publicEntries && publicEntries.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" /> Community Shadows
            </h2>
            <p className="text-xs text-zinc-500">Anonymous public entries shared by the community.</p>
            {publicEntries.map((entry: any) => (
              <div key={entry.id} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4">
                <p className="text-xs text-indigo-400 mb-2">"{entry.prompt}"</p>
                <p className="text-sm text-zinc-300 leading-relaxed">{entry.response}</p>
                <p className="text-xs text-zinc-600 mt-2">{new Date(entry.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}

        {/* Shared Reflection — Group Prompt */}
        <div className="bg-gradient-to-br from-violet-900/30 to-indigo-900/20 border border-violet-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-violet-400" />
            <div>
              <h2 className="text-white font-bold text-base">Shared Reflection</h2>
              <p className="text-xs text-zinc-500">Reflect on today's prompt anonymously with 3 others. Responses reveal only after everyone submits.</p>
            </div>
          </div>

          {!user && (
            <p className="text-sm text-zinc-500">Sign in to join a shared reflection room.</p>
          )}

          {user && !sharedRoom && (
            <button
              onClick={joinSharedRoom}
              disabled={joiningShared}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors shadow-lg shadow-violet-900/30"
            >
              <Users className="w-4 h-4" />
              {joiningShared ? "Finding a room..." : "Join Shared Prompt"}
            </button>
          )}

          {user && sharedRoom && (
            <div className="space-y-4">
              {/* Room info */}
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                <span className="px-2 py-1 rounded-lg bg-violet-900/40 border border-violet-500/30 text-violet-300 font-mono">{sharedRoom.room_code}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sharedRoom.member_count ?? "?"}/4 members</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {sharedRoom.response_count ?? 0} responded</span>
                {sharedRoom.expires_at && (
                  <span className="flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" /> purges {new Date(sharedRoom.expires_at).toLocaleDateString()}</span>
                )}
              </div>

              {/* Prompt */}
              <p className="text-white font-medium italic">"{sharedRoom.prompt}"</p>

              {/* Submit response */}
              {!sharedRoom.myResponse ? (
                <div className="space-y-2">
                  <textarea
                    value={sharedResponse}
                    onChange={e => setSharedResponse(e.target.value)}
                    placeholder="Write honestly. No one sees this until everyone has submitted..."
                    rows={4}
                    maxLength={1500}
                    className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-600">{sharedResponse.length}/1500</span>
                    <button
                      onClick={submitSharedResponse}
                      disabled={sharedResponse.trim().length < 5}
                      className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" /> Submit in Secret
                    </button>
                  </div>
                </div>
              ) : !sharedRoom.allResponded ? (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm">
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    Your response is sealed. Waiting for others...
                  </div>
                  <button onClick={refreshRoom} className="block mx-auto mt-2 text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
                    Check for updates
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-violet-400 uppercase tracking-widest">✦ All responses revealed</p>
                  {sharedRoom.responses?.map((r: any, i: number) => (
                    <div key={i} className="bg-zinc-900/60 border border-violet-500/20 rounded-xl p-4">
                      <p className="text-xs text-zinc-600 mb-1">Anonymous · {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{r.response}</p>
                    </div>
                  ))}
                  <p className="text-xs text-zinc-600 text-center">This room purges after {sharedRoom.expires_at ? new Date(sharedRoom.expires_at).toLocaleDateString() : "24 hours"}. Nothing is saved after that.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
