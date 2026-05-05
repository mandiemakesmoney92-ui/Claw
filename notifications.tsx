import { useGetNotifications, useMarkNotificationsRead, getGetNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useSEO } from "@/hooks/useSEO";
import {
  Bell, BellOff, Loader2, CheckCheck,
  ThumbsUp, ThumbsDown, MessageCircle, UserPlus, Heart,
  Zap, Flame, Radio, Coins, Star, Sparkles, Trophy, Waves
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  like: { label: "liked your post", icon: <ThumbsUp className="w-4 h-4" />, color: "text-green-400" },
  dislike: { label: "disliked your post", icon: <ThumbsDown className="w-4 h-4" />, color: "text-red-400" },
  comment: { label: "commented on your post", icon: <MessageCircle className="w-4 h-4" />, color: "text-blue-400" },
  follow: { label: "followed you", icon: <UserPlus className="w-4 h-4" />, color: "text-violet-400" },
  confession: { label: "sent you a confession", icon: <Heart className="w-4 h-4" />, color: "text-pink-400" },
  mention: { label: "mentioned you", icon: <Zap className="w-4 h-4" />, color: "text-yellow-400" },
  circle_add: { label: "added you to a circle", icon: <Star className="w-4 h-4" />, color: "text-cyan-400" },
  reality_check: { label: "flagged your post for a reality check", icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
  tip: { label: "tipped you", icon: <Coins className="w-4 h-4" />, color: "text-yellow-400" },
  compliment: { label: "spun the compliment wheel for you", icon: <Sparkles className="w-4 h-4" />, color: "text-pink-400" },
  claw_mark: { label: "left a claw mark on your post", icon: <Flame className="w-4 h-4" />, color: "text-red-400" },
  purge: { label: "your post entered a purge window", icon: <Flame className="w-4 h-4" />, color: "text-orange-400" },
  broadcast: { label: "started a broadcast", icon: <Radio className="w-4 h-4" />, color: "text-purple-400" },
  message: { label: "sent you a message", icon: <MessageCircle className="w-4 h-4" />, color: "text-blue-400" },
  frequency_match: { label: "matched your frequency", icon: <Waves className="w-4 h-4" />, color: "text-teal-400" },
  contest: { label: "your post was featured in a contest", icon: <Trophy className="w-4 h-4" />, color: "text-amber-400" },
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-border animate-pulse">
      <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
    </div>
  );
}

export default function Notifications() {
  useSEO({
    title: "Notifications",
    description: "Your CLAW notifications — follows, reactions, confessions, and more.",
    canonical: "/notifications",
    noIndex: true,
  });
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: notifications, isLoading } = useGetNotifications();
  const markRead = useMarkNotificationsRead();

  const unread = notifications?.filter(n => !n.isRead).length || 0;

  const handleMarkAll = () => {
    if (!unread) return;
    markRead.mutate(undefined, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
    });
  };

  const handleNotificationClick = (n: any) => {
    if (!n.isRead) {
      markRead.mutate(undefined, {
        onSuccess: () => qc.invalidateQueries({ queryKey: getGetNotificationsQueryKey() }),
      });
    }
    if (n.type === "follow" && n.fromUser?.id) {
      navigate(`/profile/${n.fromUser.id}`);
    } else if (n.type === "message" && n.fromUser?.id) {
      navigate("/messages");
    } else if (n.type === "confession") {
      navigate("/confessions");
    } else if (n.type === "frequency_match") {
      navigate("/frequency-match");
    } else if (n.type === "broadcast") {
      navigate("/broadcasts");
    } else if (n.postId) {
      navigate("/feed");
    } else if (n.fromUser?.id) {
      navigate(`/profile/${n.fromUser.id}`);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-serif font-bold text-foreground">Notifications</h2>
            {unread > 0 && (
              <span className="bg-accent text-accent-foreground text-xs rounded-full px-2 py-0.5 font-bold">
                {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAll}
              disabled={markRead.isPending}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <NotificationSkeleton key={i} />)}
          </div>
        ) : !notifications?.length ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <BellOff className="w-16 h-16 opacity-10" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl">🐱</span>
              </div>
            </div>
            <p className="font-serif text-lg">Nothing to see yet</p>
            <p className="text-sm mt-2 opacity-60">Ringy is watching. You'll hear when something happens.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const config = TYPE_CONFIG[n.type] || { label: n.type, icon: <Bell className="w-4 h-4" />, color: "text-muted-foreground" };
              const isClickable = !!(n.postId || n.fromUser?.id || ["confession", "frequency_match", "broadcast", "message"].includes(n.type));
              const displayName = (n as any).fromUser?.displayName || (n as any).actor?.displayName || "Someone";
              const avatarUrl = (n as any).fromUser?.avatarUrl || (n as any).actor?.avatarUrl;

              return (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
                    n.isRead
                      ? "bg-card border-border text-muted-foreground"
                      : "bg-primary/8 border-primary/25 text-foreground"
                  } ${isClickable ? "cursor-pointer hover:border-primary/40 hover:bg-primary/12 active:scale-[0.99]" : ""}`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center text-sm font-bold text-primary font-serif">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        displayName.slice(0, 1).toUpperCase()
                      )}
                    </div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-card border border-border flex items-center justify-center ${config.color}`}>
                      <div className="scale-75">{config.icon}</div>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-relaxed">
                      <span className={`font-semibold ${n.isRead ? "text-foreground/70" : "text-foreground"}`}>
                        {displayName}
                      </span>{" "}
                      <span className={n.isRead ? "text-muted-foreground" : "text-foreground/80"}>
                        {config.label}
                      </span>
                    </p>
                    {(n as any).message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 italic">
                        "{(n as any).message}"
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                      )}
                      {isClickable && (
                        <span className="text-xs text-primary/50 hover:text-primary transition-colors">
                          Tap to view →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
