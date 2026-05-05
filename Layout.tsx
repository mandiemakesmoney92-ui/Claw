import { Link, useLocation } from "wouter";
import { useAuth } from "@workspace/replit-auth-web";
import { useSession } from "@clerk/react";
import { useGetNotifications } from "@workspace/api-client-react";
import { useState, useEffect, useRef } from "react";
import {
  Home, Search, MessageCircle, Bell, User,
  TrendingUp, Radio, Play, Circle, Heart, Video,
  Star, Trophy, Zap, ShoppingBag, Flame, Shield,
  Moon, BadgeCheck, Sparkles, Megaphone, BookOpen,
  LogOut, Menu, X, Edit, Coins, TrendingDown, Info,
  ChevronDown, ChevronRight, Store, Waves, Theater, Globe, Gift, Crown, PhoneMissed,
  Ghost, Eye, Mail, Palette, Activity
} from "lucide-react";
import RingyAssistant from "./RingyAssistant";
import LachrymalEchoes from "./LachrymalEchoes";
import IncomingCallModal from "./IncomingCallModal";
import ActiveCallOverlay from "./ActiveCallOverlay";
import OutgoingCallOverlay from "./OutgoingCallOverlay";
import CallNotificationBanner from "./CallNotificationBanner";
import MissedCallsPanel, { MissedCallsBadge } from "./MissedCallsPanel";
import NotificationPermissionModal from "./NotificationPermissionModal";
import { useCall } from "@/contexts/CallContext";

const ringyRemarks = [
  "You again? I'm not impressed... yet.",
  "Go on, post something true. I dare you.",
  "Chaos is just order you haven't understood.",
  "Someone out there is lying. Expose them.",
  "Your vibe is... interesting. Not terrible.",
  "Don't be soft unless you mean it.",
  "The truth is messy. That's why it's here.",
  "Someone left you a confession. Don't be scared.",
  "Reality check time. Are you ready?",
];

const NAV_GROUPS = [
  {
    label: "Discover",
    items: [
      { href: "/feed", icon: Home, label: "Feed" },
      { href: "/world", icon: Globe, label: "World" },
      { href: "/search", icon: Search, label: "Search" },
      { href: "/trending", icon: TrendingUp, label: "Trending" },
      { href: "/reels", icon: Play, label: "Reels" },
      { href: "/live", icon: Video, label: "Go Live" },
      { href: "/broadcasts", icon: Radio, label: "Broadcasts" },
    ],
  },
  {
    label: "Social",
    items: [
      { href: "/circles", icon: Circle, label: "Circles" },
      { href: "/confessions", icon: Heart, label: "Confessions" },
      { href: "/shoutouts", icon: Megaphone, label: "Shoutouts" },
      { href: "/frequency-match", icon: Waves, label: "Frequency Match" },
      { href: "/masquerade", icon: Theater, label: "Masks Off" },
    ],
  },
  {
    label: "Mystic",
    items: [
      { href: "/pen-pals", icon: Mail, label: "Pen Pals" },
      { href: "/ghost-letters", icon: Ghost, label: "Ghost Letters" },
      { href: "/witness-wall", icon: Eye, label: "Witness Wall" },
    ],
  },
  {
    label: "Daily Magic",
    items: [
      { href: "/tarot", icon: Sparkles, label: "Daily Tarot" },
      { href: "/magic8", icon: Star, label: "Magic 8 Ball" },
      { href: "/compliment-wheel", icon: Star, label: "Compliment Wheel" },
      { href: "/shadow-work", icon: Moon, label: "Shadow Work" },
      { href: "/glitch-canvas", icon: Palette, label: "Glitch Canvas" },
    ],
  },
  {
    label: "Arena",
    items: [
      { href: "/purge-arena", icon: Flame, label: "Purge Arena" },
      { href: "/purgatory", icon: Shield, label: "Purgatory" },
      { href: "/bets", icon: TrendingDown, label: "SOULZ Bets" },
      { href: "/contests", icon: Trophy, label: "Contests" },
      { href: "/humanity-verify", icon: BadgeCheck, label: "Humanity Verify" },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/creator", icon: Zap, label: "Creator Hub" },
      { href: "/shop", icon: ShoppingBag, label: "Shop" },
      { href: "/app-store", icon: Store, label: "App Store" },
      { href: "/pranks", icon: Flame, label: "Prank Armory" },
      { href: "/referrals", icon: Gift, label: "Invite & Earn" },
      { href: "/membership", icon: Crown, label: "Membership 🐾" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/vibe", icon: Activity, label: "Vibe Check" },
    ],
  },
];

interface RipplePos { id: number; x: number; y: number; }

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { session } = useSession();
  const sessionRef = useRef(session);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [coinsBalance, setCoinsBalance] = useState<number | null>(null);
  const [soulzBalance, setSoulzBalance] = useState<number | null>(null);
  const [ringyOpen, setRingyOpen] = useState(false);
  const [ringyText, setRingyText] = useState(ringyRemarks[0]);
  const [ripples, setRipples] = useState<RipplePos[]>([]);
  const [messageUnread, setMessageUnread] = useState(0);
  const [missedCallsOpen, setMissedCallsOpen] = useState(false);
  const [permModalReason, setPermModalReason] = useState<"first-login" | "missed-call" | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "Daily Magic": false,
    "Arena": true,
    "Build": true,
  });
  const { unseenMissedCount } = useCall();
  const rippleCounter = useRef(0);
  const [sseNotifBump, setSseNotifBump] = useState(0);
  const { data: notifications, refetch: refetchNotifications } = useGetNotifications({ query: { refetchInterval: 15000 } as any });
  const unreadCount = (notifications?.filter(n => !n.isRead).length || 0) + sseNotifBump;

  useEffect(() => {
    const interval = setInterval(() => {
      setRingyText(ringyRemarks[Math.floor(Math.random() * ringyRemarks.length)]);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Auto-prompt for notification permission on login (after 4s delay)
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted" || Notification.permission === "denied") return;
    // Check if dismissed this session
    if (sessionStorage.getItem("claw_notif_session_dismissed") === "1") return;
    const t = setTimeout(() => setPermModalReason("first-login"), 4000);
    return () => clearTimeout(t);
  }, [user?.id]);

  // Show modal after a missed call if notifications still not enabled
  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") return;
    if (unseenMissedCount > 0) {
      setPermModalReason("missed-call");
    }
  }, [unseenMissedCount, user?.id]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/coins/me", { credentials: "include" })
      .then(r => r.json())
      .then(d => setCoinsBalance(d.balance ?? 0))
      .catch(() => {});
    fetch(`/api/vitals/${user.id}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setSoulzBalance(d.soulzBalance ?? 0))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      fetch("/api/messages/unread-count", { credentials: "include" })
        .then(r => r.json())
        .then(d => setMessageUnread(d.count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const iv = setInterval(fetchUnread, 30000);
    return () => clearInterval(iv);
  }, [user]);

  // Keep sessionRef in sync so the heartbeat always has the latest token
  useEffect(() => { sessionRef.current = session; }, [session]);

  useEffect(() => {
    if (!user) return;
    const pathToZone: Record<string, string> = {
      "/": "feed", "/feed": "feed", "/trending": "trending",
      "/confess": "confess", "/confessions": "confess", "/live": "live", "/reels": "reels",
      "/circles": "circles", "/broadcasts": "broadcasts",
      "/messages": "messages", "/tarot": "tarot",
      "/purgatory": "purgatory", "/shop": "shop", "/world": "world",
    };
    const getZone = () => {
      const seg = "/" + (location.split("/")[1] || "");
      return pathToZone[seg] || pathToZone[location] || "feed";
    };
    const beat = async () => {
      try {
        const token = sessionRef.current ? await sessionRef.current.getToken() : null;
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          credentials: "include",
          headers,
          body: JSON.stringify({ zone: getZone() }),
        });
      } catch { /* non-fatal */ }
    };
    beat();
    const iv = setInterval(beat, 60000);
    return () => clearInterval(iv);
  }, [user, location]);

  // Real-time notification SSE — bumps badge immediately, then syncs
  useEffect(() => {
    if (!user) return;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      es = new EventSource("/api/notifications/listen", { withCredentials: true });
      es.addEventListener("notification", () => {
        setSseNotifBump(prev => prev + 1);
        // Debounced hard refetch to sync unread count
        setTimeout(() => {
          refetchNotifications().then(() => setSseNotifBump(0)).catch(() => {});
        }, 500);
      });
      es.onerror = () => {
        es?.close();
        reconnectTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      es?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [user?.id]);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");

  const addRipple = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++rippleCounter.current;
    setRipples(prev => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const NavItem = ({ href, icon: Icon, label, badge }: { href: string; icon: any; label: string; badge?: number }) => (
    <Link href={href}>
      <div
        onClick={(e) => { setSidebarOpen(false); addRipple(e); }}
        className={`nav-item flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer relative overflow-hidden select-none ${
          isActive(href)
            ? "bg-primary/20 text-primary border border-primary/30 shadow-sm shadow-primary/10"
            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        }`}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 ${isActive(href) ? "text-primary" : ""}`} />
        <span className="font-medium text-sm flex-1">{label}</span>
        {badge != null && badge > 0 && (
          <span className="bg-accent text-accent-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
        {ripples.map(r => (
          <span key={r.id} className="absolute rounded-full bg-primary/20 pointer-events-none"
            style={{ left: r.x - 20, top: r.y - 20, width: 40, height: 40, animation: "navRipple 0.6s ease-out forwards" }} />
        ))}
      </div>
    </Link>
  );

  const renderSidebar = () => (
    <>
      <div className="p-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <Link href="/feed">
          <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent cursor-pointer select-none tracking-wider">
            CLAW
          </h1>
        </Link>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto space-y-1">
        {/* Messages + Notifications always at top */}
        <NavItem href="/messages" icon={MessageCircle} label="Messages" badge={messageUnread} />
        <NavItem href="/notifications" icon={Bell} label="Notifications" badge={unreadCount} />
        {/* Missed calls — click to open panel */}
        <div
          role="button"
          onClick={() => setMissedCallsOpen(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors hover:bg-accent/10"
        >
          <div className="relative">
            <PhoneMissed className="w-4 h-4 text-muted-foreground" />
            {unseenMissedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                {unseenMissedCount > 9 ? "9+" : unseenMissedCount}
              </span>
            )}
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            Missed Calls{unseenMissedCount > 0 ? ` (${unseenMissedCount})` : ""}
          </span>
        </div>

        <div className="h-px bg-border/50 my-2" />

        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <span className="flex-1 text-left">{group.label}</span>
              {collapsedGroups[group.label]
                ? <ChevronRight className="w-3 h-3" />
                : <ChevronDown className="w-3 h-3" />}
            </button>
            {!collapsedGroups[group.label] && (
              <div className="space-y-0.5 mb-1">
                {group.items.map(item => (
                  <NavItem key={item.href} href={item.href} icon={item.icon} label={item.label} />
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="h-px bg-border/50 my-2" />

        <NavItem href="/guide" icon={BookOpen} label="Platform Guide" />
        <NavItem href="/about" icon={Info} label="About CLAW" />
      </nav>

      {user && (coinsBalance !== null || soulzBalance !== null) && (
        <div className="px-3 py-2.5 border-t border-border flex gap-2 flex-shrink-0">
          {coinsBalance !== null && (
            <Link href="/shop?tab=coins" className="flex-1">
              <div className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/20 rounded-lg px-2.5 py-2 cursor-pointer transition-colors">
                <Coins className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] text-yellow-400 font-bold leading-none">{coinsBalance.toLocaleString()}</div>
                  <div className="text-[9px] text-white/25 leading-none mt-0.5">GEMZ</div>
                </div>
              </div>
            </Link>
          )}
          {soulzBalance !== null && (
            <div className="flex-1 flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2.5 py-2">
              <span className="text-purple-400 text-xs font-bold flex-shrink-0">✦</span>
              <div className="min-w-0">
                <div className="text-[11px] text-purple-400 font-bold leading-none">{soulzBalance.toLocaleString()}</div>
                <div className="text-[9px] text-white/25 leading-none mt-0.5">SOULZ</div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 border-t border-border space-y-0.5 flex-shrink-0">
        <Link href={`/profile/${user?.id}`}>
          <div onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">My Profile</span>
          </div>
        </Link>
        <Link href="/profile-edit">
          <div onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
            <Edit className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground font-medium">Edit Profile</span>
          </div>
        </Link>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors">
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Log Out</span>
        </button>
        <div className="pt-2 flex justify-center gap-3 flex-wrap">
          <Link href="/privacy"><span onClick={() => setSidebarOpen(false)} className="text-[9px] text-white/20 hover:text-white/40 cursor-pointer transition-colors">Privacy</span></Link>
          <span className="text-white/10 text-[9px]">·</span>
          <Link href="/terms"><span onClick={() => setSidebarOpen(false)} className="text-[9px] text-white/20 hover:text-white/40 cursor-pointer transition-colors">Terms</span></Link>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "transparent" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/70 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className="hidden lg:flex w-56 flex-shrink-0 flex-col border-r border-border/60 overflow-y-auto" style={{ background: "rgba(10,7,22,0.82)", backdropFilter: "blur(18px)" }}>
        {renderSidebar()}
      </aside>

      <aside className={`fixed top-0 left-0 h-full w-60 border-r border-border/60 z-50 flex flex-col transform transition-transform duration-300 lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`} style={{ background: "rgba(10,7,22,0.92)", backdropFilter: "blur(20px)" }}>
        {renderSidebar()}
      </aside>

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 border-b border-border/50 px-4 py-2.5 flex items-center gap-4 lg:hidden flex-shrink-0" style={{ background: "rgba(10,7,22,0.80)", backdropFilter: "blur(16px)" }}>
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground hover:text-foreground relative">
            <Menu className="w-5 h-5" />
            {(messageUnread > 0 || unreadCount > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent" />
            )}
          </button>
          <Link href="/feed" className="flex-1">
            <h1 className="text-xl font-serif font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent tracking-wider">
              CLAW
            </h1>
          </Link>
          {/* Missed calls button */}
          <button
            onClick={() => setMissedCallsOpen(true)}
            className="relative text-muted-foreground hover:text-foreground transition-colors"
          >
            <PhoneMissed className="w-5 h-5" />
            {unseenMissedCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unseenMissedCount > 9 ? "9+" : unseenMissedCount}
              </span>
            )}
          </button>
          <Link href={`/profile/${user?.id}`}>
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <CallNotificationBanner />
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/50 flex items-center justify-around px-1 py-1" style={{ background: "rgba(10,7,22,0.88)", backdropFilter: "blur(20px)" }}>
          {[
            { href: "/feed", icon: Home, label: "Feed" },
            { href: "/world", icon: Globe, label: "World" },
            { href: "/notifications", icon: Bell, label: "", badge: unreadCount },
            { href: "/messages", icon: MessageCircle, label: "", badge: messageUnread },
            { href: user?.id ? `/profile/${user.id}` : "/feed", icon: User, label: "Me" },
          ].map(({ href, icon: Icon, label, badge }) => (
            <Link key={href} href={href}>
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl relative transition-all ${
                isActive(href) ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className={`w-5 h-5 ${isActive(href) ? "drop-shadow-[0_0_6px_rgba(139,92,246,0.8)]" : ""}`} />
                {label && <span className="text-[9px] font-medium">{label}</span>}
                {badge != null && badge > 0 && (
                  <span className="absolute top-1 right-1 bg-accent text-accent-foreground text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>
      </div>

      <RingyAssistant open={ringyOpen} setOpen={setRingyOpen} text={ringyText} location={location} />
      <LachrymalEchoes />
      <OutgoingCallOverlay />
      <IncomingCallModal />
      <ActiveCallOverlay />
      {missedCallsOpen && <MissedCallsPanel onClose={() => setMissedCallsOpen(false)} />}
      {permModalReason && (
        <NotificationPermissionModal
          reason={permModalReason}
          onGranted={() => setPermModalReason(null)}
          onDismiss={() => {
            sessionStorage.setItem("claw_notif_session_dismissed", "1");
            setPermModalReason(null);
          }}
        />
      )}

      <style>{`
        @keyframes navRipple {
          0%   { transform: scale(0); opacity: 0.5; }
          100% { transform: scale(6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
