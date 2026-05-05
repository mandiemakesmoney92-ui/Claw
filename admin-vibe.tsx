import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@workspace/replit-auth-web";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { AlertTriangle, Activity, Zap, Send, RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

export default function AdminVibePage() {
  useSEO({ title: "Vibe Check — CLAW Admin", description: "Site sentiment dashboard", noIndex: true });

  const { user } = useAuth();
  const [triggering, setTriggering] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-vibe-check"],
    queryFn: async () => {
      const res = await fetch("/api/admin/vibe-check", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const triggerMut = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/vibe-check/trigger-shadow-prompt", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: (d) => toast.success(`Shadow prompt sent to ${d.sent} users`),
    onError: () => toast.error("Failed to trigger shadow prompt"),
  });

  if (!user) return null;

  const barData = data ? [
    { name: "Soft", value: data.soft, pct: data.softPct, color: "#60a5fa" },
    { name: "Direct", value: data.direct, pct: data.directPct, color: "#fb923c" },
    { name: "Claw", value: data.claw, pct: data.clawPct, color: "#f87171" },
  ] : [];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-violet-400" /> Vibe Check
            </h1>
            <p className="text-xs text-zinc-500 mt-1">Site sentiment — last 24 hours. Refreshes every 30s.</p>
          </div>
          <button
            onClick={() => refetch()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-medium transition-colors ${isFetching ? "opacity-50" : ""}`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Claw Alert Banner */}
        {data?.clawAlert && (
          <div className="bg-red-900/30 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-300 font-semibold text-sm">High Intensity Alert</p>
              <p className="text-xs text-red-400/80 mt-0.5">
                Claw interactions exceed 60% of all activity ({data.clawPct}%). Consider triggering a system-wide Shadow Work prompt to ground the community.
              </p>
            </div>
            <button
              onClick={() => triggerMut.mutate()}
              disabled={triggerMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              {triggerMut.isPending ? "Sending..." : "Trigger"}
            </button>
          </div>
        )}

        {/* Stat Cards */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0,1,2].map(i => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Soft", value: data?.soft, pct: data?.softPct, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
              { label: "Direct", value: data?.direct, pct: data?.directPct, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
              { label: "Claw", value: data?.claw, pct: data?.clawPct, color: "text-red-400", bg: `${(data?.clawPct || 0) >= 60 ? "bg-red-500/20 border-red-500/40 animate-pulse" : "bg-red-500/10 border-red-500/20"}` },
            ].map(s => (
              <div key={s.label} className={`border rounded-2xl p-4 text-center ${s.bg}`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.pct ?? "--"}%</div>
                <div className={`text-xs font-semibold ${s.color} mt-0.5`}>{s.label}</div>
                <div className="text-xs text-zinc-600 mt-1">{s.value ?? 0} posts</div>
              </div>
            ))}
          </div>
        )}

        {/* Bar chart */}
        {!isLoading && data && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Post Distribution — Last 24h</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barSize={40}>
                <XAxis dataKey="name" tick={{ fill: "#71717a", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", color: "#fff" }}
                  formatter={(v: any, name: string, props: any) => [`${v} posts (${props.payload.pct}%)`, props.payload.name]}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Gauge — intensity level */}
        {data && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" /> Community Intensity
            </h2>
            <div className="relative h-4 rounded-full overflow-hidden bg-zinc-800">
              <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${data.clawPct}%`,
                  background: data.clawPct >= 60
                    ? "linear-gradient(90deg, #ef4444, #dc2626)"
                    : data.clawPct >= 40
                    ? "linear-gradient(90deg, #f97316, #ea580c)"
                    : "linear-gradient(90deg, #3b82f6, #6366f1)"
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1.5">
              <span>Calm</span>
              <span className={data.clawPct >= 60 ? "text-red-400 font-semibold" : ""}>
                {data.clawPct >= 60 ? "⚠ Alert" : data.clawPct >= 40 ? "Elevated" : "Healthy"}
              </span>
              <span>Critical</span>
            </div>
          </div>
        )}

        {/* Manual trigger */}
        {!data?.clawAlert && (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" /> Manual Shadow Prompt
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Broadcast a grounding prompt to all active users regardless of vibe level.</p>
              </div>
              <button
                onClick={() => triggerMut.mutate()}
                disabled={triggerMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-700/60 hover:bg-indigo-600/60 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-colors"
              >
                <Send className="w-3 h-3" />
                {triggerMut.isPending ? "Sending..." : "Send Prompt"}
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-700 text-center">Admin view · {data?.total || 0} total posts in window</p>
      </div>
    </Layout>
  );
}
