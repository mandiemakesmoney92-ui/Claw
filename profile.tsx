import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import {
  useGetUserProfile, useGetFeed, useFollowUser,
  useAddCircleMember, useTipUser, getGetUserProfileQueryKey
} from "@workspace/api-client-react";
import { useAuth } from "@workspace/replit-auth-web";
import { useQueryClient } from "@tanstack/react-query";
import { useCall } from "@/contexts/CallContext";
import Layout from "@/components/Layout";
import { shouldHaveHiddenFragment, pickFragment, getEchoVisitCount } from "@/lib/lachrymal-echoes";
import VitalsBar from "@/components/VitalsBar";
import PostCard from "@/components/PostCard";
import NeonThemeBg from "@/components/NeonThemeBg";
import { ZODIAC_SIGNS, MBTI_TYPES, PET_TYPES, ELEMENT_COLORS } from "@/lib/profile-data";
import { getThemeById, getCursorById, getFontById, getFontColorById, FONT_COLOR_PACKS } from "@/lib/profile-themes";
import {
  CheckCircle, UserPlus, UserMinus, Users, Crown,
  Shield, Gift, Loader2, Edit, Heart, Music, X,
  Star, Skull, AlertTriangle, Ban, MessageCircle, Sparkles,
  Moon, Camera, Pen, Activity, Plus, ChevronRight, Trash2, Upload,
  Phone, Video, MoreHorizontal
} from "lucide-react";

const PROFILE_EMOJIS = [
  { key: "fire", label: "Fire", glyph: "🔥" },
  { key: "heart", label: "Love", glyph: "❤️" },
  { key: "star", label: "Star", glyph: "⭐" },
  { key: "skull", label: "Skull", glyph: "💀" },
  { key: "crown", label: "Crown", glyph: "👑" },
  { key: "cat", label: "Cat", glyph: "🐱" },
] as const;

const MOOD_OPTIONS = [
  "Chaotic", "Raw", "Reflective", "Unfiltered", "Calm but dangerous",
  "Healing", "Unbothered", "On one", "Truthful", "Lurking", "Ascending"
];

interface TopUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  interactionLevel?: string;
  isVerified?: boolean;
  slot: number;
}

interface TopConnections {
  topFriends: TopUser[];
  topHaters: TopUser[];
}

function ConnectionAvatar({ u, size = "sm" }: { u: TopUser; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-10 h-10 text-xs" : "w-12 h-12 text-sm";
  return (
    <Link href={`/profile/${u.id}`}>
      <div className="flex flex-col items-center gap-1 cursor-pointer group">
        <div className={`${dim} rounded-full border-2 border-primary/30 overflow-hidden bg-muted group-hover:border-primary transition-colors`}>
          {u.avatarUrl ? (
            <img
              src={u.avatarUrl}
              alt={`${u.displayName} profile picture on CLAW`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-primary font-serif">
              {u.displayName[0]}
            </div>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground truncate max-w-[48px] text-center">{u.displayName}</span>
      </div>
    </Link>
  );
}

function HaterAvatar({ u }: { u: TopUser }) {
  return (
    <Link href={`/profile/${u.id}`}>
      <div className="flex flex-col items-center gap-1 cursor-pointer group">
        <div className="w-12 h-12 rounded-full border-2 border-red-500/40 overflow-hidden bg-muted group-hover:border-red-400 transition-colors">
          {u.avatarUrl ? (
            <img
              src={u.avatarUrl}
              alt={`${u.displayName} profile picture on CLAW`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-red-400 font-serif">
              {u.displayName[0]}
            </div>
          )}
        </div>
        <span className="text-[9px] text-muted-foreground truncate max-w-[52px] text-center">{u.displayName}</span>
      </div>
    </Link>
  );
}

export default function Profile() {
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const isMe = currentUser?.id === userId;

  const { data: profile, isLoading } = useGetUserProfile(userId);
  const { data: postsData, isLoading: loadingPosts } = useGetFeed({ userId, limit: 20 });
  const followMut = useFollowUser();
  const addCircle = useAddCircleMember();
  const sendTip = useTipUser();

  const [showCircleMenu, setShowCircleMenu] = useState(false);
  const [showConnectionMenu, setShowConnectionMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [tipAmount, setTipAmount] = useState("");
  const [showTip, setShowTip] = useState(false);
  const [tipSuccess, setTipSuccess] = useState(false);
  const [topConnections, setTopConnections] = useState<TopConnections | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [connectionSaving, setConnectionSaving] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockSaving, setBlockSaving] = useState(false);
  const [profileReactions, setProfileReactions] = useState<{ counts: Record<string, number>; myReaction: string | null; total: number }>({ counts: {}, myReaction: null, total: 0 });
  const [reactingSaving, setReactingSaving] = useState(false);
  const [badges, setBadges] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [dreams, setDreams] = useState<any[]>([]);
  const [graffiti, setGraffiti] = useState<any[]>([]);
  const [liveViewers, setLiveViewers] = useState(0);
  const [ownedApps, setOwnedApps] = useState<string[]>([]);
  const [graffitiInput, setGraffitiInput] = useState("");
  const [graffitiColor, setGraffitiColor] = useState("#a855f7");
  const [graffitiSaving, setGraffitiSaving] = useState(false);
  const [showNewAlbum, setShowNewAlbum] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newDream, setNewDream] = useState(false);
  const [dreamTitle, setDreamTitle] = useState("");
  const [dreamContent, setDreamContent] = useState("");
  const [dreamType, setDreamType] = useState<"dream" | "nightmare">("dream");
  const [expandedAlbum, setExpandedAlbum] = useState<number | null>(null);
  const [albumPhotos, setAlbumPhotos] = useState<Record<number, any[]>>({});
  const [albumUploading, setAlbumUploading] = useState<Record<number, boolean>>({});
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption?: string } | null>(null);

  useEffect(() => {
    if (expandedAlbum === null || albumPhotos[expandedAlbum] !== undefined) return;
    fetch(`/api/albums/${expandedAlbum}/photos`, { credentials: "include" })
      .then(r => r.json())
      .then(photos => setAlbumPhotos(prev => ({ ...prev, [expandedAlbum]: Array.isArray(photos) ? photos : [] })))
      .catch(() => setAlbumPhotos(prev => ({ ...prev, [expandedAlbum]: [] })));
  }, [expandedAlbum]);

  const uploadAlbumPhoto = async (albumId: number, file: File) => {
    setAlbumUploading(prev => ({ ...prev, [albumId]: true }));
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "image/jpeg" }),
      });
      if (!metaRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await metaRes.json();
      const putRes = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
      if (!putRes.ok) throw new Error("Upload failed");
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      const saveRes = await fetch(`/api/albums/${albumId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ photoUrl: serveUrl }),
      });
      if (!saveRes.ok) throw new Error("Failed to save photo");
      const newPhoto = await saveRes.json();
      setAlbumPhotos(prev => ({ ...prev, [albumId]: [newPhoto, ...(prev[albumId] || [])] }));
      setAlbums(prev => prev.map((a: any) => a.id === albumId ? { ...a, photoCount: (a.photoCount || 0) + 1 } : a));
    } catch (e) {
      console.error("Album photo upload failed:", e);
    } finally {
      setAlbumUploading(prev => ({ ...prev, [albumId]: false }));
    }
  };

  const deleteAlbumPhoto = async (albumId: number, photoId: number) => {
    const res = await fetch(`/api/albums/${albumId}/photos/${photoId}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setAlbumPhotos(prev => ({ ...prev, [albumId]: (prev[albumId] || []).filter((p: any) => p.id !== photoId) }));
      setAlbums(prev => prev.map((a: any) => a.id === albumId ? { ...a, photoCount: Math.max(0, (a.photoCount || 1) - 1) } : a));
    }
  };

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/top-connections`, { credentials: "include" })
      .then(r => r.json())
      .then(setTopConnections)
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    if (!userId || !currentUser) return;
    fetch(`/api/users/me/block-status/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setIsBlocked(!!d.blocked))
      .catch(() => {});
  }, [userId, currentUser]);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/users/${userId}/profile-reactions`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setProfileReactions(d))
      .catch(() => {});
  }, [userId]);

  // Visitor tracking + heartbeat
  useEffect(() => {
    if (!userId || !currentUser || isMe) return;
    fetch(`/api/visitors/${userId}`, { method: "POST", credentials: "include" }).catch(() => {});
  }, [userId, currentUser, isMe]);

  useEffect(() => {
    if (!userId) return;
    const fetchVisitors = () => {
      fetch(`/api/visitors/${userId}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => setLiveViewers(d.liveViewers || 0))
        .catch(() => {});
    };
    fetchVisitors();
    const interval = setInterval(fetchVisitors, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  // Badges
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/badges/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(setBadges)
      .catch(() => {});
  }, [userId]);

  // Albums
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/albums/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(setAlbums)
      .catch(() => {});
  }, [userId]);

  // Dreams
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/dreams/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(setDreams)
      .catch(() => {});
  }, [userId]);

  // Owned apps (for graffiti wall check)
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/app-store`, { credentials: "include" })
      .then(r => r.json())
      .then(d => setOwnedApps(d.owned || []))
      .catch(() => {});
  }, [userId]);

  // Graffiti
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/graffiti/${userId}`, { credentials: "include" })
      .then(r => r.json())
      .then(setGraffiti)
      .catch(() => {});
  }, [userId]);

  // Cursor effect — must be before any early returns (Rules of Hooks)
  useEffect(() => {
    if (isMe || !profile) return;
    const p = profile as any;
    const cursor = getCursorById(p.profileCursor || "default");
    const prev = document.body.style.cursor;
    document.body.style.cursor = cursor.css;
    return () => { document.body.style.cursor = prev; };
  }, [profile, isMe]);

  // SEO — computed from live profile data, delegated to useSEO hook
  const _p = profile as any;
  const _seoDisplayName = _p?.displayName || "User";
  const _seoUsername = _p?.username ? ` (@${_p.username})` : "";
  const _seoBio = typeof _p?.bio === "string" ? _p.bio.trim() : "";
  const _seoZodiac = _p?.zodiacSign ? ` Zodiac: ${_p.zodiacSign}.` : "";
  const _seoMbti = _p?.mbtiType ? ` Type: ${_p.mbtiType}.` : "";
  const _seoDesc = _seoBio
    ? `${_seoDisplayName}'s profile on CLAW. ${_seoBio}${_seoZodiac}${_seoMbti}`
    : `${_seoDisplayName}'s profile on CLAW — posts, social circles, raw truths, and more.`;
  useSEO({
    title: `${_seoDisplayName}${_seoUsername}`,
    description: _seoDesc,
    ogType: "profile",
    ogImage: _p?.avatarUrl || _p?.bannerUrl || undefined,
    ogImageAlt: `${_seoDisplayName}'s profile photo on CLAW`,
    keywords: `${_seoDisplayName}, CLAW, social platform, mystic, consent-based, truth${_p?.username ? `, @${_p.username}` : ""}${_seoMbti ? `, ${_p.mbtiType}` : ""}`,
    canonical: `/profile/${userId}`,
    jsonLd: _p
      ? {
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: `${_seoDisplayName} on CLAW`,
          description: _seoDesc,
          url: `${window.location.origin}/profile/${userId}`,
          mainEntity: {
            "@type": "Person",
            name: _seoDisplayName,
            alternateName: _p.username || undefined,
            description: _seoBio || `${_seoDisplayName} on CLAW`,
            image: _p.avatarUrl || undefined,
          },
        }
      : undefined,
    jsonLdId: "profile-jsonld",
  });

  const handleProfileReact = async (emoji: string) => {
    if (!currentUser || !userId) return;
    setReactingSaving(true);
    try {
      const r = await fetch(`/api/users/${userId}/profile-reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emoji }),
      });
      if (r.ok) {
        const updated = await fetch(`/api/users/${userId}/profile-reactions`, { credentials: "include" }).then(r2 => r2.json());
        setProfileReactions(updated);
      }
    } finally {
      setReactingSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!userId) return;
    setBlockSaving(true);
    try {
      const r = await fetch(`/api/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: isBlocked ? "unblock" : "block" }),
      });
      const d = await r.json();
      setIsBlocked(d.blocked);
    } finally {
      setBlockSaving(false);
    }
  };

  const handleFollow = () => {
    followMut.mutate(
      { userId, data: { action: (profile as any)?.isFollowing ? "unfollow" : "follow" } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getGetUserProfileQueryKey(userId) }) }
    );
  };

  const handleAddToCircle = (circleType: "Inner" | "Network" | "Opposition") => {
    (addCircle.mutate as any)(
      { data: { userId, circleType } },
      { onSuccess: () => setShowCircleMenu(false) }
    );
  };

  const handleSetConnection = async (type: "friend" | "hater", slot: number) => {
    setConnectionSaving(true);
    try {
      const r = await fetch(`/api/users/${userId}/set-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ connectionType: type, slot }),
      });
      if (r.ok) {
        setConnectionStatus(type === "friend" ? "Added to friends!" : "Marked as hater!");
        setShowConnectionMenu(false);
        setTimeout(() => setConnectionStatus(null), 3000);
      }
    } finally {
      setConnectionSaving(false);
    }
  };

  const handleTip = () => {
    const amount = parseInt(tipAmount);
    if (!amount || amount <= 0) return;
    sendTip.mutate(
      { userId, data: { amount, message: "" } } as any,
      {
        onSuccess: () => {
          setTipAmount("");
          setShowTip(false);
          setTipSuccess(true);
          setTimeout(() => setTipSuccess(false), 3000);
        },
      }
    );
  };

  const p = (profile as any) || {};
  const bioHiddenText = useMemo(() => {
    if (!p.id) return null;
    const visits = getEchoVisitCount();
    return shouldHaveHiddenFragment(p.id + "_bio", visits) ? pickFragment(visits) : null;
  }, [p.id]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-24">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto p-8 text-center text-muted-foreground">
          <p className="font-serif text-lg">User not found</p>
        </div>
      </Layout>
    );
  }
  const theme = getThemeById(p.profileTheme || "midnight");
  const profileFont = getFontById(p.profileFont || "inter");
  const fontColorPack = getFontColorById(p.profileFontColor || "white");
  const fontColorCss = fontColorPack.color === "rainbow"
    ? undefined
    : fontColorPack.color;
  const fontColorStyle = fontColorPack.color === "rainbow"
    ? "linear-gradient(90deg, #a855f7, #ec4899, #f59e0b, #22d3ee, #34d399)"
    : undefined;
  if (profileFont.googleFont && typeof document !== "undefined") {
    const linkId = `gfont-${profileFont.id}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = `https://fonts.googleapis.com/css2?family=${profileFont.googleFont}&display=swap`;
      document.head.appendChild(link);
    }
  }

  const zodiac = ZODIAC_SIGNS.find(z => z.sign === p.zodiacSign);
  const mbti = MBTI_TYPES.find(m => m.type === p.mbtiType);
  const pets = PET_TYPES.filter(({ key }) => (p[key] || 0) > 0);
  const hasOtherPet = p.petOtherCount > 0 && p.petOtherType;
  const friends = topConnections?.topFriends || [];
  const haters = topConnections?.topHaters || [];

  const songSrc = p.profileSong
    ? (p.profileSong.startsWith("/api/") ? p.profileSong : `/api/storage/objects${(p.profileSong).replace(/^\/objects/, "")}`)
    : undefined;

  const glitchClass = p.profileEffect && p.profileEffect !== "none" ? `profile-glitch-${p.profileEffect}` : "";

  return (
    <Layout>
      <div className={`max-w-2xl mx-auto p-4 pb-16 ${glitchClass}`}>

        {/* Shame Badge */}
        {p.shameBadge && (
          <div className="mb-4 flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-0.5">Accountability Mark</div>
              <p className="text-sm">{p.shameBadge}</p>
            </div>
          </div>
        )}

        {/* Banner + Avatar */}
        <div className="relative mb-8">
          <div className="h-36 rounded-2xl border border-border overflow-hidden">
            {p.bannerUrl ? (
              <img
                src={p.bannerUrl}
                alt={`${p.displayName} profile banner on CLAW`}
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                <div className="w-full h-full" style={{ background: theme.banner }} />
                {theme.bgImage && (
                  <div className="absolute inset-0 h-36 rounded-2xl" style={{ backgroundImage: theme.bgImage }} />
                )}
                <div
                  className="absolute inset-0 h-36 rounded-2xl"
                  style={{ background: `radial-gradient(ellipse at 60% 50%, ${theme.glow.replace("0.4", "0.2")} 0%, transparent 70%)` }}
                />
                <NeonThemeBg themeId={p.profileTheme || "midnight"} className="h-36 rounded-2xl opacity-80" />
              </>
            )}
          </div>

          <div className="absolute bottom-0 left-6 transform translate-y-1/2">
            <div className="w-20 h-20 rounded-2xl border-4 border-background bg-muted overflow-hidden shadow-xl shadow-purple-900/30">
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt={`${p.displayName} profile avatar on CLAW`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold font-serif text-primary/60">
                  {p.displayName?.slice(0, 1)}
                </div>
              )}
            </div>
          </div>

          <div className="absolute bottom-0 right-0 flex items-center gap-1.5">
            {isMe ? (
              <Link href="/profile-edit">
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 text-sm font-medium transition-colors bg-card">
                  <Edit className="w-4 h-4" /> Edit Profile
                </button>
              </Link>
            ) : (
              <>
                {/* Primary: Follow */}
                <button
                  onClick={handleFollow}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    p.isFollowing
                      ? "bg-muted border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
                      : "bg-primary text-primary-foreground hover:bg-accent shadow-lg shadow-primary/20"
                  }`}
                >
                  {p.isFollowing
                    ? <><UserMinus className="w-4 h-4" /> Unfollow</>
                    : <><UserPlus className="w-4 h-4" /> Follow</>}
                </button>

                {/* Primary: Message */}
                <a
                  href="/messages"
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors bg-card"
                  title="Send message"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>

                {/* Primary: Call */}
                <CallButton userId={p.userId} compact />

                {/* Secondary: ··· More dropdown */}
                <div className="relative">
                  <button
                    onClick={() => { setShowMoreMenu(m => !m); setShowCircleMenu(false); setShowConnectionMenu(false); }}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-sm border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors bg-card"
                    title="More options"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {showMoreMenu && (
                    <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-2xl shadow-black/60 z-30 overflow-hidden py-1">

                      {/* Circle sub-section */}
                      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Add to Circle</div>
                      {(["Inner", "Network", "Opposition"] as const).map(ct => (
                        <button
                          key={ct}
                          onClick={() => { handleAddToCircle(ct); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          {ct === "Inner" && <Crown className="w-4 h-4 text-yellow-400 flex-shrink-0" />}
                          {ct === "Network" && <Users className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                          {ct === "Opposition" && <Shield className="w-4 h-4 text-red-400 flex-shrink-0" />}
                          <span>{ct} Circle</span>
                        </button>
                      ))}

                      <div className="h-px bg-border/60 my-1" />

                      {/* Friends/Haters sub-section */}
                      <div className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Top Friends (slot)</div>
                      <div className="flex flex-wrap gap-1 px-4 pb-2">
                        {Array.from({ length: 8 }, (_, i) => i + 1).map(slot => (
                          <button
                            key={slot}
                            onClick={() => { handleSetConnection("friend", slot); setShowMoreMenu(false); }}
                            disabled={connectionSaving}
                            className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/30 transition-colors border border-primary/20"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                      <div className="px-3 pb-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Top Haters (slot)</div>
                      <div className="flex gap-1 px-4 pb-2">
                        {[1, 2, 3].map(slot => (
                          <button
                            key={slot}
                            onClick={() => { handleSetConnection("hater", slot); setShowMoreMenu(false); }}
                            disabled={connectionSaving}
                            className="w-7 h-7 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors border border-red-500/20"
                          >
                            {slot}
                          </button>
                        ))}
                      </div>

                      <div className="h-px bg-border/60 my-1" />

                      {/* Tip */}
                      {p.tipJarEnabled && (
                        <button
                          onClick={() => { setShowTip(t => !t); setShowMoreMenu(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                        >
                          <Gift className="w-4 h-4 text-accent flex-shrink-0" />
                          <span>Send Gift (GEMZ)</span>
                        </button>
                      )}

                      {/* SkippidyPap */}
                      <div className="px-2 py-1">
                        <SkippidyPapButton userId={p.userId} inMenu />
                      </div>

                      <div className="h-px bg-border/60 my-1" />

                      {/* Block */}
                      <button
                        onClick={() => { handleBlock(); setShowMoreMenu(false); }}
                        disabled={blockSaving}
                        className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left disabled:opacity-50 ${
                          isBlocked ? "text-red-400 hover:bg-red-500/10" : "text-muted-foreground hover:bg-muted hover:text-red-400"
                        }`}
                      >
                        {blockSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4 flex-shrink-0" />}
                        <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {connectionStatus && (
          <div className="mb-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 text-primary text-sm text-center">
            {connectionStatus}
          </div>
        )}

        {/* Tip success toast */}
        {tipSuccess && (
          <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 mb-3 text-center text-sm text-accent font-medium animate-pulse">
            Gift sent successfully!
          </div>
        )}

        {/* Always-visible tip jar card */}
        {!isMe && p.tipJarEnabled && !tipSuccess && (
          <div className="bg-card border rounded-2xl p-4 mb-4 relative overflow-hidden"
            style={{ borderColor: theme.ring + "40" }}>
            <div className="absolute inset-0 opacity-5" style={{ background: theme.banner }} />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 flex-shrink-0" style={{ color: theme.ring }} />
                <div>
                  <p className="text-sm font-medium text-foreground">Tip {p.displayName}</p>
                  <p className="text-xs text-muted-foreground">Send GEMZ</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {[10, 25, 50, 100].map(amt => (
                  <button
                    key={amt}
                    onClick={() => { setTipAmount(String(amt)); setShowTip(true); }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:opacity-90"
                    style={{ borderColor: theme.ring + "50", color: theme.ring, background: theme.accent }}
                  >
                    {amt} 🪙
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tip form */}
        {showTip && (
          <div className="bg-card border border-accent/30 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">Send GEMZ</p>
              <button onClick={() => setShowTip(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              {[10, 25, 50, 100].map(amt => (
                <button
                  key={amt}
                  onClick={() => setTipAmount(String(amt))}
                  className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${tipAmount === String(amt) ? "border-accent bg-accent/20 text-accent" : "border-border text-muted-foreground hover:border-accent/40 hover:text-accent"}`}
                >
                  {amt}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={tipAmount}
                onChange={e => setTipAmount(e.target.value)}
                placeholder="Custom amount"
                min="1"
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={handleTip}
                disabled={sendTip.isPending || !tipAmount || parseInt(tipAmount) <= 0}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-primary disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                <Gift className="w-3.5 h-3.5" />
                {sendTip.isPending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        )}

        {/* Identity */}
        <div className="mt-14 mb-6">
          <div className="flex items-center gap-2 mb-0.5">
            <h1
              className="text-2xl font-bold"
              style={{
                fontFamily: profileFont.fontFamily,
                color: fontColorStyle ? "transparent" : (fontColorCss || "#ffffff"),
                background: fontColorStyle || undefined,
                WebkitBackgroundClip: fontColorStyle ? "text" : undefined,
                backgroundClip: fontColorStyle ? "text" : undefined,
              }}
            >
              {p.displayName}
              {p.username ? ` (@${p.username})` : ""}
            </h1>
            {p.isVerified && <CheckCircle className="w-5 h-5 text-primary fill-primary/20" />}
            {(p as any).isMember && <span title="CLAW Member" className="text-lg leading-none">🐾</span>}
          </div>
          {p.username && <p className="text-muted-foreground text-sm">@{p.username}</p>}

          {p.currentMood && (
            <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
              <Sparkles className="w-3 h-3" />
              {p.currentMood}
            </div>
          )}

          {p.bio && (
            <p className="text-foreground/70 mt-3 text-sm leading-relaxed">
              {p.bio}
              {bioHiddenText && (
                <span className="echo-hidden" aria-hidden="true">{" "}{bioHiddenText}</span>
              )}
              <span className="sr-only">
                {" "}This profile on CLAW features social posts, mood expression, profile music, and community connections.
              </span>
            </p>
          )}

          <div className="sr-only">
            <h2>{p.displayName} profile details</h2>
            <p>
              {p.displayName} has a public user profile on CLAW, a customizable social media platform
              for authentic expression, mood sharing, social posting, music profiles, and personal identity.
            </p>
            <p>
              This profile may include posts, followers, following, profile music, zodiac sign {p.zodiacSign || "not specified"},
              personality type {p.mbtiType || "not specified"}, and social connections.
            </p>
          </div>

          {/* Profile Emoji Reactions */}
          {!isMe && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {PROFILE_EMOJIS.map(e => {
                const count = profileReactions.counts[e.key] || 0;
                const isMine = profileReactions.myReaction === e.key;
                return (
                  <button
                    key={e.key}
                    onClick={() => handleProfileReact(e.key)}
                    disabled={reactingSaving || !currentUser}
                    title={e.label}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all ${
                      isMine
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                    }`}
                  >
                    <span>{e.glyph}</span>
                    {count > 0 && <span>{count}</span>}
                  </button>
                );
              })}
            </div>
          )}
          {isMe && profileReactions.total > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {PROFILE_EMOJIS.filter(e => (profileReactions.counts[e.key] || 0) > 0).map(e => (
                <div key={e.key} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground">
                  <span>{e.glyph}</span>
                  <span>{profileReactions.counts[e.key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Profile Song */}
          {songSrc && (
            <div className="mt-4 flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Music className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {p.profileSongTitle && (
                  <div className="text-xs font-medium text-muted-foreground mb-1 truncate">{p.profileSongTitle}</div>
                )}
                <audio
                  controls
                  src={songSrc}
                  className="w-full h-8"
                  autoPlay={!!p.audioAutoplay && !isMe}
                />
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-6 mt-5">
            {[
              { val: p.followerCount ?? 0, label: "Followers", href: `/profile/${userId}/followers` },
              { val: p.followingCount ?? 0, label: "Following", href: `/profile/${userId}/following` },
              { val: p.postCount ?? 0, label: "Posts", href: undefined },
            ].map(({ val, label, href }) => (
              href ? (
                <Link key={label} href={href}>
                  <div className="text-center cursor-pointer group">
                    <div className="text-xl font-bold font-serif text-foreground group-hover:text-primary transition-colors">{val}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary/70 transition-colors">{label}</div>
                  </div>
                </Link>
              ) : (
                <div key={label} className="text-center">
                  <div className="text-xl font-bold font-serif text-foreground">{val}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              )
            ))}
          </div>

          {/* Vitals Bar — Hunger / Health / Energy + Credibility + SOULZ */}
          <div className="mt-4">
            <VitalsBar userId={p.userId} />
          </div>
        </div>

        {/* Top 13 Friends */}
        {friends.length > 0 && (
          <div className="mb-6 bg-card border border-primary/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-yellow-400" />
              <h2 className="font-serif font-semibold text-foreground text-sm uppercase tracking-widest">
                Top {friends.length} Friends
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {friends.slice(0, 13).map(u => (
                <ConnectionAvatar key={u.id} u={u} size={friends.length > 6 ? "sm" : "md"} />
              ))}
              {friends.length < 13 && (
                <div className="flex flex-col items-center gap-1 opacity-30">
                  <div className="w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground">{13 - friends.length} slots</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Top 3 Haters */}
        {haters.length > 0 && (
          <div className="mb-6 bg-card border border-red-500/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Skull className="w-4 h-4 text-red-400" />
              <h2 className="font-serif font-semibold text-foreground text-sm uppercase tracking-widest">
                Top {haters.length} Haters
              </h2>
              <span className="ml-1 text-xs text-red-400/60 italic">The ones who stay</span>
            </div>
            <div className="flex gap-4">
              {haters.slice(0, 3).map(u => <HaterAvatar key={u.id} u={u} />)}
              {haters.length < 3 && Array.from({ length: 3 - haters.length }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1 opacity-25">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-red-500/40 flex items-center justify-center">
                    <Skull className="w-4 h-4 text-red-400/40" />
                  </div>
                  <span className="text-[9px] text-muted-foreground">empty</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Badges */}
        {(zodiac || mbti || p.hasPets) && (
          <div className="space-y-3 mb-8">
            {zodiac && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${ELEMENT_COLORS[zodiac.element]}`}>
                <span className="text-2xl leading-none">{zodiac.symbol}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{zodiac.sign}</span>
                    <span className="text-xs opacity-60">{zodiac.element} · {zodiac.dates}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {zodiac.traits.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 border border-current/20 opacity-80">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mbti && (
              <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${mbti.color}`}>
                <div className="text-center min-w-[44px]">
                  <div className="text-lg font-bold font-serif leading-none">{mbti.type}</div>
                  <div className="text-[9px] opacity-50 mt-0.5 uppercase tracking-wide">{mbti.group}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{mbti.nickname}</div>
                  <div className="text-xs opacity-60 mt-0.5 leading-snug">{mbti.description}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {mbti.traits.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-black/20 border border-current/20 opacity-80">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {p.hasPets && (pets.length > 0 || hasOtherPet) && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-pink-400/30 bg-pink-400/8 text-pink-300">
                <Heart className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-semibold opacity-70 uppercase tracking-widest mb-2">Pet Family</div>
                  <div className="flex flex-wrap gap-2">
                    {pets.map(({ key, label, icon }) => (
                      <span key={key} className="flex items-center gap-1.5 text-sm bg-black/20 border border-pink-400/20 rounded-full px-3 py-1">
                        <span>{icon}</span>
                        <span className="font-medium">{p[key]}</span>
                        <span className="opacity-70 text-xs">{label}</span>
                      </span>
                    ))}
                    {hasOtherPet && (
                      <span className="flex items-center gap-1.5 text-sm bg-black/20 border border-pink-400/20 rounded-full px-3 py-1">
                        <span>🐾</span>
                        <span className="font-medium">{p.petOtherCount}</span>
                        <span className="opacity-70 text-xs capitalize">{p.petOtherType}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Heartbeat — live viewers */}
        {liveViewers > 0 && (
          <div className="flex items-center gap-2 px-1 py-2">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
              <span className="text-xs text-red-400 font-medium">
                {liveViewers} {liveViewers === 1 ? "person" : "people"} viewing right now
              </span>
            </div>
            <div className="flex -space-x-1">
              {Array.from({ length: Math.min(liveViewers, 3) }).map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full bg-red-400/20 border border-red-400/40 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="border-t border-border pt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-semibold text-foreground text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Star className="w-3.5 h-3.5" /> Kitty Badges
            </h2>
            {badges.length > 0 && (
              <span className="text-xs text-muted-foreground">{badges.length} earned</span>
            )}
          </div>
          {badges.length === 0 && !isMe ? (
            <p className="text-xs text-muted-foreground/50 italic">No badges yet — still on their journey.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {badges.map((badge: any) => (
                <div
                  key={badge.id ?? badge.badgeId}
                  title={badge.description}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-transform hover:scale-105 cursor-default ${
                    badge.rarity === "legendary"
                      ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]"
                      : badge.rarity === "rare"
                        ? "bg-purple-500/10 border-purple-500/30 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.15)]"
                        : "bg-white/5 border-white/15 text-white/60"
                  }`}
                >
                  <span>{badge.emoji}</span>
                  <span>{badge.name}</span>
                  {badge.rarity === "legendary" && <span className="text-[9px] opacity-60">✦ LEGENDARY</span>}
                  {badge.rarity === "rare" && <span className="text-[9px] opacity-60">◆ RARE</span>}
                </div>
              ))}
              {isMe && (
                <div
                  title="Earn more badges by interacting, posting, and connecting with new people"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/10 text-xs text-muted-foreground/40 cursor-help hover:border-white/20 transition-colors"
                >
                  <span>?</span>
                  <span>More to unlock...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photo Albums */}
        {(albums.length > 0 || isMe) && (
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif font-semibold text-foreground text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Camera className="w-3.5 h-3.5" /> Albums
              </h2>
              {isMe && (
                <button
                  onClick={() => setShowNewAlbum(!showNewAlbum)}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  <Plus className="w-3.5 h-3.5" /> New Album
                </button>
              )}
            </div>
            {showNewAlbum && isMe && (
              <div className="flex gap-2 mb-3">
                <input
                  value={newAlbumTitle}
                  onChange={e => setNewAlbumTitle(e.target.value)}
                  placeholder="Album title..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-purple-500/40"
                />
                <button
                  onClick={async () => {
                    if (!newAlbumTitle.trim()) return;
                    const res = await fetch("/api/albums", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ title: newAlbumTitle }),
                    });
                    if (res.ok) {
                      const album = await res.json();
                      setAlbums(prev => [album, ...prev]);
                      setNewAlbumTitle("");
                      setShowNewAlbum(false);
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-xl transition-colors"
                >
                  Create
                </button>
              </div>
            )}
            {albums.length === 0 && isMe && (
              <p className="text-white/25 text-xs italic">No albums yet. Create one to start sharing photo memories.</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album: any) => (
                <div
                  key={album.id}
                  onClick={() => setExpandedAlbum(expandedAlbum === album.id ? null : album.id)}
                  className={`bg-white/5 border rounded-xl p-3 cursor-pointer transition-colors ${expandedAlbum === album.id ? "border-purple-500/40 bg-purple-900/10" : "border-white/10 hover:border-purple-500/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Camera className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span className="text-sm font-medium text-white/80 truncate">{album.title}</span>
                    <ChevronRight className={`w-3.5 h-3.5 text-white/30 ml-auto flex-shrink-0 transition-transform ${expandedAlbum === album.id ? "rotate-90" : ""}`} />
                  </div>
                  <div className="text-xs text-white/30">{album.photoCount || 0} photo{(album.photoCount || 0) !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>

            {expandedAlbum !== null && (() => {
              const album = albums.find((a: any) => a.id === expandedAlbum);
              if (!album) return null;
              const photos: any[] = albumPhotos[expandedAlbum] || [];
              const isLoading = albumPhotos[expandedAlbum] === undefined;
              const isUploadingAlbum = albumUploading[expandedAlbum] || false;
              return (
                <div className="mt-3 bg-white/3 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-white/80">{album.title}</span>
                    <div className="flex items-center gap-2">
                      {isMe && (
                        <label className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-xs rounded-xl cursor-pointer transition-colors ${isUploadingAlbum ? "bg-purple-700/50 pointer-events-none" : "bg-purple-600/80 hover:bg-purple-500"}`}>
                          {isUploadingAlbum ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {isUploadingAlbum ? "Uploading..." : "Add Photo"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={isUploadingAlbum}
                            onChange={async e => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              await uploadAlbumPhoto(expandedAlbum, file);
                              e.target.value = "";
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                    </div>
                  ) : photos.length === 0 ? (
                    <p className="text-white/30 text-xs italic text-center py-6">
                      {isMe ? "No photos yet. Click \"Add Photo\" to start." : "This album is empty."}
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {photos.map((photo: any) => (
                        <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden bg-white/5 cursor-pointer" onClick={() => setLightboxPhoto({ url: photo.photoUrl, caption: photo.caption })}>
                          <img
                            src={photo.photoUrl}
                            alt={photo.caption || "Album photo"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          {photo.caption && (
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-[10px] text-white/80 line-clamp-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {photo.caption}
                            </div>
                          )}
                          {isMe && (
                            <button
                              onClick={e => { e.stopPropagation(); deleteAlbumPhoto(expandedAlbum, photo.id); }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-black/60 hover:bg-red-600/80 rounded-lg transition-all"
                            >
                              <Trash2 className="w-3 h-3 text-white" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Dream Catcher */}
        {(dreams.length > 0 || isMe) && (
          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-serif font-semibold text-foreground text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Moon className="w-3.5 h-3.5" /> Dream Catcher
              </h2>
              {isMe && (
                <button
                  onClick={() => setNewDream(!newDream)}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Dream
                </button>
              )}
            </div>
            {newDream && isMe && (
              <div className="bg-[#0d0d1a] border border-purple-500/20 rounded-xl p-4 space-y-3 mb-4">
                <div className="flex gap-2">
                  {(["dream", "nightmare"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDreamType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dreamType === t ? (t === "dream" ? "bg-purple-600 text-white" : "bg-red-600 text-white") : "bg-white/5 text-white/40"}`}
                    >
                      {t === "dream" ? "🌙 Dream" : "🌑 Nightmare"}
                    </button>
                  ))}
                </div>
                <input
                  value={dreamTitle}
                  onChange={e => setDreamTitle(e.target.value)}
                  placeholder="What was it called or about?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-purple-500/40"
                />
                <textarea
                  value={dreamContent}
                  onChange={e => setDreamContent(e.target.value)}
                  placeholder="Describe it..."
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/25 focus:outline-none focus:border-purple-500/40 resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setNewDream(false)} className="px-3 py-1.5 text-xs text-white/40 hover:text-white/70">Cancel</button>
                  <button
                    onClick={async () => {
                      if (!dreamTitle.trim() || !dreamContent.trim()) return;
                      const res = await fetch("/api/dreams", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ title: dreamTitle, content: dreamContent, dreamType }),
                      });
                      if (res.ok) {
                        const entry = await res.json();
                        setDreams(prev => [entry, ...prev]);
                        setDreamTitle("");
                        setDreamContent("");
                        setNewDream(false);
                      }
                    }}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-xl transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
            {dreams.length === 0 && isMe ? (
              <p className="text-white/25 text-xs italic">No dreams logged yet. Your subconscious has things to say.</p>
            ) : (
              <div className="space-y-3">
                {dreams.slice(0, 3).map((d: any) => (
                  <div key={d.id} className={`border rounded-xl p-4 ${d.dreamType === "nightmare" ? "border-red-500/20 bg-red-500/5" : "border-purple-500/20 bg-purple-500/5"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span>{d.dreamType === "nightmare" ? "🌑" : "🌙"}</span>
                      <span className="text-sm font-medium text-white/80">{d.title}</span>
                      <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${d.dreamType === "nightmare" ? "bg-red-500/20 text-red-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {d.dreamType}
                      </span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed line-clamp-2">{d.content}</p>
                  </div>
                ))}
                {dreams.length > 3 && (
                  <p className="text-xs text-white/30 text-center">+{dreams.length - 3} more dreams</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Graffiti Wall (only if profile owner has the app) */}
        {ownedApps.includes("graffiti_wall") && (
          <div className="border-t border-border pt-5">
            <h2 className="font-serif font-semibold text-foreground mb-3 text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Pen className="w-3.5 h-3.5" /> Graffiti Wall
            </h2>
            {currentUser && !isMe && (
              <div className="flex gap-2 mb-4">
                <div className="flex gap-1">
                  {["#a855f7", "#ec4899", "#f59e0b", "#34d399", "#60a5fa", "#f97316"].map(c => (
                    <button
                      key={c}
                      onClick={() => setGraffitiColor(c)}
                      className={`w-5 h-5 rounded-full border-2 transition-all ${graffitiColor === c ? "border-white scale-110" : "border-transparent"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <input
                  value={graffitiInput}
                  onChange={e => setGraffitiInput(e.target.value.slice(0, 150))}
                  placeholder="Leave your mark..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/90 placeholder-white/25 focus:outline-none focus:border-purple-500/40"
                />
                <button
                  disabled={!graffitiInput.trim() || graffitiSaving}
                  onClick={async () => {
                    setGraffitiSaving(true);
                    const res = await fetch(`/api/graffiti/${userId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ content: graffitiInput, color: graffitiColor }),
                    });
                    if (res.ok) {
                      const entry = await res.json();
                      setGraffiti(prev => [entry, ...prev]);
                      setGraffitiInput("");
                    }
                    setGraffitiSaving(false);
                  }}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs rounded-xl transition-colors"
                >
                  Spray
                </button>
              </div>
            )}
            <div className="space-y-2">
              {graffiti.length === 0 ? (
                <p className="text-white/25 text-xs italic">The wall is blank. Be the first to leave your mark.</p>
              ) : graffiti.map((g: any) => (
                <div key={g.id} className="flex items-start gap-2 py-1.5">
                  <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: g.color || "#a855f7" }} />
                  <p className="text-sm leading-relaxed flex-1" style={{ color: g.color || "#a855f7" }}>{g.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tip Jar — visible on all profiles */}
        {!isMe && (profile as any)?.tipJarEnabled && (
          <div className="border-t border-border pt-5">
            <div className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/15 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">🪙</span>
                <div>
                  <div className="text-sm font-semibold text-white/70">Tip {(profile as any)?.displayName}</div>
                  <div className="text-xs text-white/35">Show some love with GEMZ</div>
                </div>
              </div>
              <button
                onClick={() => setShowTip(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-xl transition-colors"
              >
                Tip 💜
              </button>
            </div>
          </div>
        )}

        {/* Posts */}
        <div className="border-t border-border pt-6">
          <h2 className="font-serif font-semibold text-foreground mb-4 text-sm uppercase tracking-widest text-muted-foreground">Posts</h2>
          {loadingPosts ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !postsData?.length ? (
            <div className="text-center py-10 text-muted-foreground">
              <p className="font-serif text-base">Nothing here yet.</p>
              {isMe && <p className="text-xs mt-2">Go to the feed and share something.</p>}
            </div>
          ) : (
            <div className="space-y-4">
              {postsData.map(post => (
                <PostCard key={post.id} post={post} currentUserId={currentUser?.id} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Photo Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <button className="absolute top-4 right-4 p-2 text-white/60 hover:text-white bg-black/40 rounded-full" onClick={() => setLightboxPhoto(null)}>
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightboxPhoto.url} alt={lightboxPhoto.caption || "Photo"} className="w-full max-h-[80vh] object-contain rounded-2xl" />
            {lightboxPhoto.caption && (
              <p className="text-white/60 text-sm text-center mt-3">{lightboxPhoto.caption}</p>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}

function CallButton({ userId, compact }: { userId: string; compact?: boolean }) {
  const { initiateCall, activeCall } = useCall();
  const [calling, setCalling] = useState(false);
  const [showCallMenu, setShowCallMenu] = useState(false);

  const startCall = async (type: "audio" | "video") => {
    if (calling || activeCall) return;
    setShowCallMenu(false);
    setCalling(true);
    try { await initiateCall([userId], type); } finally { setCalling(false); }
  };

  const busy = !!activeCall;

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowCallMenu(m => !m)}
          disabled={calling || busy}
          title="Call"
          className="flex items-center justify-center w-9 h-9 rounded-xl text-sm border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-all bg-card disabled:opacity-50"
        >
          {calling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
        </button>
        {showCallMenu && (
          <div className="absolute right-0 top-full mt-1 w-40 bg-card border border-border rounded-xl shadow-2xl shadow-black/60 z-40 overflow-hidden py-1">
            <button
              onClick={() => startCall("audio")}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            >
              <Phone className="w-4 h-4 text-emerald-400" /> Voice Call
            </button>
            <button
              onClick={() => startCall("video")}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted transition-colors text-left"
            >
              <Video className="w-4 h-4 text-violet-400" /> Video Call
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => startCall("audio")}
        disabled={calling || busy}
        title="Voice call"
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-emerald-400 hover:border-emerald-500/30 transition-all bg-card disabled:opacity-50"
      >
        <Phone className="w-4 h-4" />
      </button>
      <button
        onClick={() => startCall("video")}
        disabled={calling || busy}
        title="Video call"
        className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm border border-border text-muted-foreground hover:text-violet-400 hover:border-violet-500/30 transition-all bg-card disabled:opacity-50"
      >
        <Video className="w-4 h-4" />
      </button>
    </div>
  );
}

function SkippidyPapButton({ userId, inMenu }: { userId: string; inMenu?: boolean }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const sendPap = async () => {
    if (sending || sent) return;
    setSending(true);
    try {
      const r = await fetch(`/api/paps/${userId}`, { method: "POST", credentials: "include" });
      if (r.ok) setSent(true);
    } finally {
      setSending(false);
    }
  };

  if (inMenu) {
    return (
      <button
        onClick={sendPap}
        disabled={sending || sent}
        className={`w-full flex items-center gap-2.5 px-2 py-2 text-sm rounded-lg transition-colors text-left disabled:opacity-60 ${
          sent ? "text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-amber-400"
        }`}
      >
        <span className="text-base leading-none flex-shrink-0">🐾</span>
        <span>{sent ? "Papped!" : "Skippidy Pap"}</span>
      </button>
    );
  }

  return (
    <button
      onClick={sendPap}
      disabled={sending || sent}
      title={sent ? "Papped!" : "Skippidy Pap!"}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all bg-card ${
        sent
          ? "border-amber-500/40 text-amber-400"
          : "border-border text-muted-foreground hover:text-amber-400 hover:border-amber-500/30"
      } disabled:opacity-60`}
    >
      <span className="text-base leading-none">🐾</span>
      {sent ? "Papped!" : "Pap"}
    </button>
  );
}