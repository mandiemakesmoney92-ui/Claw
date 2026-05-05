import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { Flame, AlertTriangle, CheckCircle, Clock, Users, Shield, Heart } from "lucide-react";
import { toast } from "sonner";

export default function Purgatory() {
  useSEO({
    title: "Purgatory — AI Bot Detection and Content Moderation | CLAW",
    description:
      "CLAW's Purgatory is an AI moderation system that detects bot-generated and inauthentic content. Flagged accounts complete penance tasks to return — keeping the platform human and honest.",
    canonical: "/purgatory",
    noIndex: false,
  });

  const { user } = useAuth();
  const qc = useQueryClient();
  const [apologyText, setApologyText] = useState("");
  const [activeTab, setActiveTab] = useState<"mine" | "community">("mine");

  const { data: status } = useQuery({
    queryKey: ["purgatory-me"],
    queryFn: async () => {
      const res = await fetch("/api/purgatory/me", { credentials: "include" });
      if (!res.ok) return { isInPurgatory: false };
      return res.json();
    },
    enabled: !!user,
  });

  const { data: publicCases } = useQuery({
    queryKey: ["purgatory-public"],
    queryFn: async () => {
      const res = await fetch("/api/purgatory/public", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const penanceMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/purgatory/me/penance", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apologyText,
          caseId: status?.activeCase?.id,
        }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.freed) {
        toast.success("🕊️ You have been released from Purgatory. Your soul is restored.");
      } else {
        toast.success(`✅ Penance accepted. ${data.penanceCompleted}/${status?.penanceRequired} complete.`);
      }
      setApologyText("");
      qc.invalidateQueries({ queryKey: ["purgatory-me"] });
      qc.invalidateQueries({ queryKey: ["profile-vitals"] });
    },
    onError: () => toast.error("Penance submission failed."),
  });

  const PENANCE_TASKS = [
    { icon: "✍️", label: "Write a genuine public apology (below)" },
    { icon: "💌", label: "Give 5 real compliments via the Compliment Wheel" },
    { icon: "🗣️", label: "Post one verified original thought in your own voice" },
  ];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 px-4 py-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-500/20 border border-orange-500/40 mb-4">
            <Flame className="w-10 h-10 text-orange-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">The Purgatory</h1>
          <p className="text-zinc-400 text-sm">Where AI-generated souls face their reckoning.<br/>Complete penance tasks to restore your Humanity.</p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-700">
          {[{ id: "mine" as const, label: "My Status" }, { id: "community" as const, label: "Community Cases" }].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id ? "bg-orange-500/20 text-orange-300 border-b-2 border-orange-500" : "text-zinc-400 hover:text-white"
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "mine" && (
          <div className="space-y-4">
            {!status?.isInPurgatory ? (
              <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-white mb-1">Your soul is free</h2>
                <p className="text-zinc-400 text-sm">You're not in Purgatory. Keep it real. Keep it human.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Purgatory alert */}
                <div className="bg-orange-900/20 border border-orange-500/40 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
                    <h2 className="text-white font-bold">You Are in Purgatory</h2>
                  </div>
                  <p className="text-zinc-400 text-sm mb-3">{status.reason}</p>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Since {new Date(status.purgatorySince).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      {status.penanceCompleted}/{status.penanceRequired} penance done
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, (status.penanceCompleted / status.penanceRequired) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Penance tasks */}
                <div className="bg-zinc-900/60 border border-zinc-700 rounded-2xl p-5">
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Heart className="w-4 h-4 text-pink-400" /> Penance Tasks
                  </h3>
                  <div className="space-y-3">
                    {PENANCE_TASKS.map((task, i) => (
                      <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                        i < (status.penanceCompleted || 0) ? "bg-green-900/20 border border-green-500/30" : "bg-zinc-800/40 border border-zinc-700"
                      }`}>
                        <span className="text-xl">{task.icon}</span>
                        <span className={`text-sm ${i < (status.penanceCompleted || 0) ? "text-green-400 line-through" : "text-zinc-300"}`}>
                          {task.label}
                        </span>
                        {i < (status.penanceCompleted || 0) && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
                      </div>
                    ))}
                  </div>

                  {/* Apology text */}
                  <div className="mt-5">
                    <label className="block text-sm text-zinc-400 mb-2">Write your apology to the community:</label>
                    <textarea
                      value={apologyText}
                      onChange={e => setApologyText(e.target.value)}
                      placeholder="I sincerely apologize for submitting AI-generated content..."
                      maxLength={500}
                      rows={4}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-zinc-600">{apologyText.length}/500</span>
                      <button
                        onClick={() => penanceMutation.mutate()}
                        disabled={apologyText.length < 20 || penanceMutation.isPending}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
                      >
                        {penanceMutation.isPending ? "Submitting..." : "Submit Penance"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* What is Purgatory */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400" /> What Is Purgatory?
              </h3>
              <div className="space-y-2 text-sm text-zinc-400">
                <p>CLAW is a platform built on <span className="text-white font-medium">human authenticity</span>. AI-generated content erodes trust and poisons the feed.</p>
                <p>When our system detects AI-generated patterns in your posts, or community members flag your content, you may be sent to Purgatory.</p>
                <p>Complete your penance tasks to restore your <span className="text-orange-300">Credibility Score</span>, regain <span className="text-blue-300">Humanity Verified</span> status, and return to the community.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "community" && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500 text-center">Active purgatory cases in the community</p>
            {!publicCases?.length ? (
              <div className="text-center text-zinc-500 py-12">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No active cases. The community is behaving.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {publicCases.map((c: any) => (
                  <div key={c.id} className="bg-zinc-900/60 border border-zinc-700/60 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Flame className="w-4 h-4 text-orange-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {c.isAiGenerated && (
                            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">AI Detected</span>
                          )}
                          <span className="text-xs text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-zinc-300">{c.reason}</p>
                        {c.evidence && (
                          <p className="text-xs text-zinc-600 mt-1 line-clamp-2">"{c.evidence}"</p>
                        )}
                      </div>
                    </div>
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
