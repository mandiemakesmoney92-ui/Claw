import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import ClawModeGuard from "@/components/ClawModeGuard";
import { useGetMyProfile, useUpdateMyProfile } from "@workspace/api-client-react";
import { useSEO } from "@/hooks/useSEO";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { ZODIAC_SIGNS, MBTI_TYPES, PET_TYPES, ELEMENT_COLORS } from "@/lib/profile-data";
import { PROFILE_THEMES, CURSOR_OPTIONS, PROFILE_FONTS, FONT_COLOR_PACKS, GLITCH_EFFECTS, RINGY_OUTFITS } from "@/lib/profile-themes";
import { useSafeMode } from "@/contexts/SafeModeContext";
import {
  Loader2, Save, ChevronDown, ChevronUp, Check,
  Camera, Music, Upload, X, ImagePlus, Palette, MousePointer2, Type, Sparkles,
} from "lucide-react";

type Section = "identity" | "media" | "zodiac" | "mbti" | "pets" | "appearance" | "soul";

function parseArr(val: any): string[] {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val || "[]"); } catch { return []; }
}

function SectionCard({ title, subtitle, open, onToggle, children }: {
  title: string; subtitle: string; open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-4">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors"
      >
        <div className="text-left">
          <div className="font-serif font-semibold text-foreground">{title}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 pt-2 border-t border-border">{children}</div>}
    </div>
  );
}

interface UploadState {
  uploading: boolean;
  error: string | null;
  progress: number;
}

function useFileUpload(onSuccess: (objectPath: string, url: string) => void) {
  const [state, setState] = useState<UploadState>({ uploading: false, error: null, progress: 0 });

  const upload = async (file: File) => {
    setState({ uploading: true, error: null, progress: 5 });
    try {
      const metaRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type || "application/octet-stream" }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get upload URL");
      }
      const { uploadURL, objectPath } = await metaRes.json();
      setState(s => ({ ...s, progress: 30 }));

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Failed to upload file");

      setState(s => ({ ...s, progress: 100 }));
      const serveUrl = `/api/storage/objects${objectPath.replace(/^\/objects/, "")}`;
      onSuccess(objectPath, serveUrl);
    } catch (e: any) {
      setState(s => ({ ...s, error: e.message || "Upload failed" }));
    } finally {
      setState(s => ({ ...s, uploading: false }));
    }
  };

  return { upload, ...state };
}

function ImageUploadButton({
  label, currentUrl, accept, onUploaded
}: {
  label: string; currentUrl?: string; accept: string; onUploaded: (objectPath: string, serveUrl: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(currentUrl);
  const { upload, uploading, error, progress } = useFileUpload((path, url) => {
    setPreview(url);
    onUploaded(path, url);
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setPreview(localPreview);
    upload(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group overflow-hidden rounded-xl border border-border bg-muted/50 hover:border-primary/50 transition-colors"
        style={{ width: 100, height: 100 }}
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full gap-1.5 text-muted-foreground group-hover:text-primary transition-colors">
            <ImagePlus className="w-6 h-6" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <div className="text-xs text-white">{progress}%</div>
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 bg-black/50 py-1 text-center text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity">
          Change
        </div>
      </button>
      <span className="text-xs text-muted-foreground">{label}</span>
      {error && <span className="text-xs text-red-400">{error}</span>}
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
    </div>
  );
}

function songServeUrl(stored: string | undefined): string | undefined {
  if (!stored) return undefined;
  if (stored.startsWith("/api/")) return stored;
  if (stored.startsWith("/objects/")) return `/api/storage/objects${stored.replace(/^\/objects/, "")}`;
  return stored;
}

function AudioUploadButton({
  currentSong, currentTitle, onUploaded
}: {
  currentSong?: string; currentTitle?: string; onUploaded: (serveUrl: string, title: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [songTitle, setSongTitle] = useState(currentTitle || "");
  const [audioPreview, setAudioPreview] = useState<string | undefined>(songServeUrl(currentSong));
  const { upload, uploading, error, progress } = useFileUpload((_path, url) => {
    onUploaded(url, songTitle);
    setAudioPreview(url);
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!songTitle) setSongTitle(file.name.replace(/\.[^.]+$/, ""));
    upload(file);
    e.target.value = "";
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSongTitle(e.target.value);
    if (audioPreview) onUploaded(audioPreview, e.target.value);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Song Title</label>
        <input
          value={songTitle}
          onChange={handleTitleChange}
          placeholder="Give your profile song a title"
          className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/50 hover:border-primary/50 hover:text-primary text-muted-foreground text-sm font-medium transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading... {progress}%</>
          ) : (
            <><Upload className="w-4 h-4" /> Upload Audio</>
          )}
        </button>
        {audioPreview && !uploading && (
          <div className="flex items-center gap-1.5 text-xs text-primary">
            <Music className="w-3.5 h-3.5" />
            <span>Song uploaded</span>
          </div>
        )}
      </div>

      {audioPreview && (
        <audio controls src={audioPreview} className="w-full h-9 mt-1" />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

export default function ProfileEdit() {
  useSEO({
    title: "Edit Profile",
    description: "Customize your CLAW profile — theme, bio, zodiac, MBTI, mood, and more.",
    canonical: "/profile/edit",
    noIndex: true,
  });
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useGetMyProfile();
  const updateMut = useUpdateMyProfile();

  const [openSection, setOpenSection] = useState<Section>("appearance");
  const [appearance, setAppearance] = useState({ profileTheme: "midnight", profileCursor: "default", profileFont: "inter", profileFontColor: "white", profileEffect: "none", ringyOutfit: "default" });
  const appearanceInitRef = useRef(false);
  const [mediaFields, setMediaFields] = useState({
    avatarUrl: "",
    bannerUrl: "",
    profileSong: "",
    profileSongTitle: "",
  });
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    bio: "",
    interactionLevel: "Soft",
    zodiacSign: "",
    mbtiType: "",
    hasPets: false,
    petCats: 0,
    petDogs: 0,
    petBirds: 0,
    petFish: 0,
    petRabbits: 0,
    petHamsters: 0,
    petReptiles: 0,
    petOtherType: "",
    petOtherCount: 0,
    currentMood: "",
    at3am: "",
    deepFears: "",
    moonFeeling: "",
    movingSong: "",
    comfortFood: "",
    innerChild: "",
    shadowSelf: "",
    secretTalent: "",
    mostAlive: "",
    neverTell: "",
    loveLanguage: "",
    triggerWarning: "",
    proudestMoment: "",
    cryAbout: "",
    weirdFact: "",
    hiddenSkill: "",
    mysticalBelief: "",
    pastLife: "",
    spiritAnimal: "",
    manifestingNow: "",
    ifIWereElement: "",
    guiltPleasure: "",
    whyUseApp: "",
    idealDay: "",
  });

  useEffect(() => {
    if (profile) {
      const p = profile as any;
      setForm({
        displayName: p.displayName || "",
        username: p.username || "",
        bio: p.bio || "",
        interactionLevel: p.interactionLevel || "Soft",
        zodiacSign: p.zodiacSign || "",
        mbtiType: p.mbtiType || "",
        hasPets: p.hasPets || false,
        petCats: p.petCats || 0,
        petDogs: p.petDogs || 0,
        petBirds: p.petBirds || 0,
        petFish: p.petFish || 0,
        petRabbits: p.petRabbits || 0,
        petHamsters: p.petHamsters || 0,
        petReptiles: p.petReptiles || 0,
        petOtherType: p.petOtherType || "",
        petOtherCount: p.petOtherCount || 0,
        currentMood: p.currentMood || "",
        at3am: p.at3am || "",
        deepFears: p.deepFears || "",
        moonFeeling: p.moonFeeling || "",
        movingSong: p.movingSong || "",
        comfortFood: p.comfortFood || "",
        innerChild: p.innerChild || "",
        shadowSelf: p.shadowSelf || "",
        secretTalent: p.secretTalent || "",
        mostAlive: p.mostAlive || "",
        neverTell: p.neverTell || "",
        loveLanguage: p.loveLanguage || "",
        triggerWarning: p.triggerWarning || "",
        proudestMoment: p.proudestMoment || "",
        cryAbout: p.cryAbout || "",
        weirdFact: p.weirdFact || "",
        hiddenSkill: p.hiddenSkill || "",
        mysticalBelief: p.mysticalBelief || "",
        pastLife: p.pastLife || "",
        spiritAnimal: p.spiritAnimal || "",
        manifestingNow: p.manifestingNow || "",
        ifIWereElement: p.ifIWereElement || "",
        guiltPleasure: p.guiltPleasure || "",
        whyUseApp: p.whyUseApp || "",
        idealDay: p.idealDay || "",
      });
      setMediaFields({
        avatarUrl: p.avatarUrl || "",
        bannerUrl: p.bannerUrl || "",
        profileSong: p.profileSong || "",
        profileSongTitle: p.profileSongTitle || "",
      });
      if (!appearanceInitRef.current) {
        appearanceInitRef.current = true;
        setAppearance({
          profileTheme: p.profileTheme || "midnight",
          profileCursor: p.profileCursor || "default",
          profileFont: p.profileFont || "inter",
          profileFontColor: p.profileFontColor || "white",
          profileEffect: p.profileEffect || "none",
          ringyOutfit: p.ringyOutfit || "default",
        });
      }
    }
  }, [profile]);

  const toggle = (s: Section) => setOpenSection(prev => (prev === s ? ("" as Section) : s));

  const handleSave = () => {
    updateMut.mutate(
      { data: { ...form, ...mediaFields, ...appearance } as any },
      {
        onSuccess: (updated) => {
          qc.invalidateQueries();
          navigate(`/profile/${(updated as any)?.id || (profile as any)?.id}`);
        },
      }
    );
  };

  const selectedZodiac = ZODIAC_SIGNS.find(z => z.sign === form.zodiacSign);
  const selectedMbti = MBTI_TYPES.find(m => m.type === form.mbtiType);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-4 pb-24">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground">Edit Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Let people see the real you</p>
          </div>
          <button
            onClick={handleSave}
            disabled={updateMut.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-accent transition-colors disabled:opacity-60"
          >
            {updateMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        {/* Media */}
        <SectionCard
          title="Photos & Music"
          subtitle="Profile photo, banner, and your vibe song"
          open={openSection === "media"}
          onToggle={() => toggle("media")}
        >
          <div className="mt-4 space-y-6">
            <div>
              <label className="block text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Profile & Banner Photos</label>
              <div className="flex items-start gap-6">
                <ImageUploadButton
                  label="Avatar"
                  currentUrl={mediaFields.avatarUrl || undefined}
                  accept="image/*"
                  onUploaded={(_, url) => setMediaFields(f => ({ ...f, avatarUrl: url }))}
                />
                <ImageUploadButton
                  label="Banner"
                  currentUrl={mediaFields.bannerUrl || undefined}
                  accept="image/*"
                  onUploaded={(_, url) => setMediaFields(f => ({ ...f, bannerUrl: url }))}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2.5">JPEG or PNG. Avatar shown everywhere. Banner displayed on your profile page.</p>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-3 font-medium uppercase tracking-wide">Profile Song</label>
              <AudioUploadButton
                currentSong={mediaFields.profileSong || undefined}
                currentTitle={mediaFields.profileSongTitle || undefined}
                onUploaded={(path, title) => setMediaFields(f => ({ ...f, profileSong: path, profileSongTitle: title }))}
              />
              <p className="text-xs text-muted-foreground mt-2.5">MP3, AAC, or WAV. Plays when people visit your profile.</p>
            </div>
          </div>
        </SectionCard>

        {/* Appearance */}
        <SectionCard
          title="Appearance"
          subtitle="Profile theme and custom cursor"
          open={openSection === "appearance"}
          onToggle={() => toggle("appearance")}
        >
          <div className="mt-4 space-y-6">
            {/* Theme Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-primary" />
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Profile Theme</label>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {PROFILE_THEMES.map(t => {
                  const selected = appearance.profileTheme === t.id;
                  const p = profile as any;
                  const purchased: string[] = (() => { try { return JSON.parse(p?.purchasedThemes || "[]"); } catch { return []; } })();
                  const locked = !t.free && !purchased.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={async () => {
                        if (locked) {
                          const confirmed = window.confirm(`Unlock "${t.name}" for ${t.cost} GEMZ?`);
                          if (!confirmed) return;
                          const newPurchased = [...purchased, t.id];
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ purchasedThemes: JSON.stringify(newPurchased), profileTheme: t.id }),
                          });
                        } else {
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ profileTheme: t.id }),
                          });
                        }
                        setAppearance(a => ({ ...a, profileTheme: t.id }));
                      }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${t.preview} flex-shrink-0 border border-white/10`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none">{t.name}</p>
                        {!t.free && (
                          <p className="text-[10px] text-yellow-400/80 mt-0.5">{t.cost} 🪙 Coins</p>
                        )}
                        {t.free && (
                          <p className="text-[10px] text-green-400/70 mt-0.5">Free</p>
                        )}
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      {locked && <span className="text-sm">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cursor Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MousePointer2 className="w-4 h-4 text-primary" />
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Custom Cursor</label>
                <span className="text-xs text-muted-foreground italic">(others see this on your profile)</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {CURSOR_OPTIONS.map(c => {
                  const selected = appearance.profileCursor === c.id;
                  const p = profile as any;
                  const purchasedCursors: string[] = parseArr(p?.purchasedCursors);
                  const locked = (c as any).premium && !purchasedCursors.includes((c as any).pack);
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (locked) {
                          window.location.href = "/app-store";
                          return;
                        }
                        setAppearance(a => ({ ...a, profileCursor: c.id }));
                      }}
                      title={locked ? `Buy the ${(c as any).pack === "cursor_mystic_pack" ? "Mystic" : "Dark"} Cursor Pack in the App Store` : c.name}
                      className={`relative flex flex-col items-center gap-1.5 p-2.5 rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/10"
                          : locked
                          ? "border-border/30 bg-muted/20 opacity-50"
                          : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <span className="text-xl leading-none">{c.preview}</span>
                      <span className="text-[10px] text-muted-foreground leading-none">{c.name}</span>
                      {locked && <span className="absolute top-1 right-1 text-[9px]">🔒</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground/50 mt-2">Premium cursors require a cursor pack from the App Store.</p>
            </div>

            {/* Font Pack Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Type className="w-4 h-4 text-primary" />
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Profile Font</label>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {PROFILE_FONTS.map(f => {
                  const p = profile as any;
                  const purchasedFonts: string[] = parseArr(p?.purchasedFonts);
                  const selected = appearance.profileFont === f.id;
                  const locked = !f.free && !purchasedFonts.includes(f.id);
                  if (f.googleFont) {
                    const linkId = `gfont-${f.id}`;
                    if (!document.getElementById(linkId)) {
                      const link = document.createElement("link");
                      link.id = linkId;
                      link.rel = "stylesheet";
                      link.href = `https://fonts.googleapis.com/css2?family=${f.googleFont}&display=swap`;
                      document.head.appendChild(link);
                    }
                  }
                  return (
                    <button
                      key={f.id}
                      onClick={async () => {
                        if (locked) {
                          const confirmed = window.confirm(`Unlock "${f.name}" font for ${f.cost} GEMZ?`);
                          if (!confirmed) return;
                          const newPurchased = [...purchasedFonts, f.id];
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ purchasedFonts: JSON.stringify(newPurchased), profileFont: f.id }),
                          });
                        } else {
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ profileFont: f.id }),
                          });
                        }
                        setAppearance(a => ({ ...a, profileFont: f.id }));
                      }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none mb-1">{f.name}</p>
                        <p className="text-xs text-muted-foreground leading-none mb-1.5">{f.description}</p>
                        <p className="text-sm leading-none opacity-70" style={{ fontFamily: f.fontFamily }}>{f.preview}</p>
                        {!f.free && <p className="text-[10px] text-yellow-400/80 mt-1.5">{f.cost} 🪙 GEMZ</p>}
                        {f.free && <p className="text-[10px] text-green-400/70 mt-1.5">Free</p>}
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      {locked && <span className="text-sm">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Font Color Pack Picker */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-primary" />
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Font Color</label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {FONT_COLOR_PACKS.map(c => {
                  const p = profile as any;
                  const purchasedFonts: string[] = parseArr(p?.purchasedFonts);
                  const selected = appearance.profileFontColor === c.id;
                  const locked = !c.free && !purchasedFonts.includes(`color_${c.id}`);
                  return (
                    <button
                      key={c.id}
                      onClick={async () => {
                        if (locked) {
                          const confirmed = window.confirm(`Unlock "${c.name}" font color for ${c.cost} GEMZ?`);
                          if (!confirmed) return;
                          const newPurchased = [...purchasedFonts, `color_${c.id}`];
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ purchasedFonts: JSON.stringify(newPurchased), profileFontColor: c.id }),
                          });
                        } else {
                          await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ profileFontColor: c.id }),
                          });
                        }
                        setAppearance(a => ({ ...a, profileFontColor: c.id }));
                      }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                          : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full flex-shrink-0 border border-white/20 ${c.preview}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-none">{c.name}</p>
                        {!c.free && <p className="text-[10px] text-yellow-400/80 mt-0.5">{c.cost} 🪙 GEMZ</p>}
                        {c.free && <p className="text-[10px] text-green-400/70 mt-0.5">Free</p>}
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      {locked && <span className="text-sm">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Glitch Effects */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Profile Glitch Effect</label>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-3">Others see this on your profile. Purchase from the App Store.</p>
              <div className="grid grid-cols-2 gap-2">
                {GLITCH_EFFECTS.map(g => {
                  const p = profile as any;
                  const purchasedEffects: string[] = (() => { try { return JSON.parse(p?.purchasedEffects || "[]"); } catch { return []; } })();
                  const selected = appearance.profileEffect === g.id;
                  const locked = g.appId !== null && !purchasedEffects.includes(g.appId);
                  return (
                    <button
                      key={g.id}
                      onClick={async () => {
                        if (locked) { window.location.href = "/app-store"; return; }
                        setAppearance(a => ({ ...a, profileEffect: g.id }));
                        await fetch("/api/users/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ profileEffect: g.id }),
                        });
                      }}
                      className={`relative flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                        selected ? "border-primary bg-primary/10" : locked ? "border-border/30 bg-muted/20 opacity-50" : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <span className="text-xl">{g.preview}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{g.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{g.description}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      {locked && <span className="text-sm flex-shrink-0">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ringy Outfit */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">🐱</span>
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ringy's Outfit</label>
              </div>
              <p className="text-[10px] text-muted-foreground/60 mb-3">Customize Ringy's appearance. Purchase outfits from the App Store.</p>
              <div className="grid grid-cols-2 gap-2">
                {RINGY_OUTFITS.map(o => {
                  const p = profile as any;
                  const purchasedEffects: string[] = parseArr(p?.purchasedEffects);
                  const selected = appearance.ringyOutfit === o.id;
                  const locked = o.appId !== null && !purchasedEffects.includes(o.appId);
                  return (
                    <button
                      key={o.id}
                      onClick={async () => {
                        if (locked) { window.location.href = "/app-store"; return; }
                        setAppearance(a => ({ ...a, ringyOutfit: o.id }));
                        await fetch("/api/users/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({ ringyOutfit: o.id }),
                        });
                      }}
                      className={`relative flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                        selected ? "border-primary bg-primary/10" : locked ? "border-border/30 bg-muted/20 opacity-50" : "border-border hover:border-primary/40 bg-muted/50"
                      }`}
                    >
                      <span className="text-xl">{o.emoji || "🐱"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{o.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{o.description}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                      {locked && <span className="text-sm flex-shrink-0">🔒</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Identity */}
        <SectionCard
          title="Identity"
          subtitle="Name, bio, interaction style"
          open={openSection === "identity"}
          onToggle={() => toggle("identity")}
        >
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Display Name</label>
              <input
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                placeholder="How you appear to others"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Username</label>
              <div className="flex items-center bg-muted border border-border rounded-xl px-4 py-2.5 focus-within:border-primary transition-colors">
                <span className="text-muted-foreground text-sm mr-1">@</span>
                <input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") }))}
                  className="flex-1 bg-transparent text-sm text-foreground focus:outline-none"
                  placeholder="your_handle"
                  maxLength={20}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/60 mt-1">3–20 characters, lowercase, numbers, underscores only.</p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Bio</label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                rows={3}
                className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                placeholder="What should people know about you?"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Current Mood / Vibe</label>
              <div className="flex gap-2">
                <input
                  value={form.currentMood}
                  onChange={e => setForm(f => ({ ...f, currentMood: e.target.value }))}
                  className="flex-1 bg-muted border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                  placeholder="Chaotic, Raw, Ascending..."
                  maxLength={80}
                />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Chaotic", "Raw", "Reflective", "Unfiltered", "Calm but dangerous", "Healing", "Unbothered", "Ascending", "Truthful", "Lurking"].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, currentMood: m }))}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.currentMood === m ? "border-primary/60 bg-primary/15 text-primary" : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
                  >
                    {m}
                  </button>
                ))}
                {form.currentMood && (
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, currentMood: "" }))}
                    className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5 font-medium uppercase tracking-wide">Interaction Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["Soft", "Direct"] as const).map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setForm(f => ({ ...f, interactionLevel: lvl }))}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      form.interactionLevel === lvl
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
                <ClawModeGuard
                  isSelected={form.interactionLevel === "Claw"}
                  onSelect={() => setForm(f => ({ ...f, interactionLevel: "Claw" }))}
                  onRevertToSoft={() => setForm(f => ({ ...f, interactionLevel: "Soft" }))}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {form.interactionLevel === "Soft" && "Kind, supportive, no harsh feedback."}
                {form.interactionLevel === "Direct" && "Honest, clear, no sugarcoating but no cruelty."}
                {form.interactionLevel === "Claw" && "Raw, unfiltered. You can handle it."}
              </p>
            </div>
          </div>
        </SectionCard>

        {/* Zodiac */}
        <SectionCard
          title="Zodiac Sign"
          subtitle={form.zodiacSign ? `${form.zodiacSign} ${ZODIAC_SIGNS.find(z => z.sign === form.zodiacSign)?.symbol}` : "Choose your sign"}
          open={openSection === "zodiac"}
          onToggle={() => toggle("zodiac")}
        >
          <div className="mt-4">
            {selectedZodiac && (
              <div className={`mb-4 p-3 rounded-xl border ${ELEMENT_COLORS[selectedZodiac.element]} flex items-start gap-3`}>
                <span className="text-2xl leading-none">{selectedZodiac.symbol}</span>
                <div>
                  <div className="font-semibold text-sm">{selectedZodiac.sign} · {selectedZodiac.element}</div>
                  <div className="text-xs opacity-70 mt-0.5">{selectedZodiac.dates}</div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedZodiac.traits.map(t => (
                      <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-black/20 border border-current/20">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              {ZODIAC_SIGNS.map(z => (
                <button
                  key={z.sign}
                  onClick={() => setForm(f => ({ ...f, zodiacSign: z.sign }))}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm transition-colors text-left ${
                    form.zodiacSign === z.sign
                      ? `${ELEMENT_COLORS[z.element]} border-current`
                      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  <span className="text-lg leading-none">{z.symbol}</span>
                  <div>
                    <div className="font-medium text-xs">{z.sign}</div>
                    <div className="text-xs opacity-60">{z.element}</div>
                  </div>
                  {form.zodiacSign === z.sign && <Check className="w-3 h-3 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>

        {/* Myers-Briggs */}
        <SectionCard
          title="Myers-Briggs Type"
          subtitle={form.mbtiType ? `${form.mbtiType} — ${MBTI_TYPES.find(m => m.type === form.mbtiType)?.nickname}` : "Pick your personality type"}
          open={openSection === "mbti"}
          onToggle={() => toggle("mbti")}
        >
          <div className="mt-4">
            {selectedMbti && (
              <div className={`mb-4 p-3 rounded-xl border ${selectedMbti.color}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-serif">{selectedMbti.type}</span>
                  <span className="text-sm opacity-80">— {selectedMbti.nickname}</span>
                  <span className="ml-auto text-xs opacity-60 bg-black/20 px-2 py-0.5 rounded-full">{selectedMbti.group}</span>
                </div>
                <p className="text-xs opacity-70 mt-1">{selectedMbti.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedMbti.traits.map(t => (
                    <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-black/20 border border-current/20">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {(["Analyst", "Diplomat", "Sentinel", "Explorer"] as const).map(group => (
              <div key={group} className="mb-4">
                <div className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mb-2">{group}s</div>
                <div className="grid grid-cols-2 gap-2">
                  {MBTI_TYPES.filter(m => m.group === group).map(m => (
                    <button
                      key={m.type}
                      onClick={() => setForm(f => ({ ...f, mbtiType: m.type }))}
                      className={`text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                        form.mbtiType === m.type
                          ? `${m.color} border-current`
                          : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold font-serif">{m.type}</span>
                        {form.mbtiType === m.type && <Check className="w-3 h-3 ml-auto" />}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5">{m.nickname}</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Pets */}
        <SectionCard
          title="Pets"
          subtitle={form.hasPets ? "You have companions" : "No pets (yet)"}
          open={openSection === "pets"}
          onToggle={() => toggle("pets")}
        >
          <div className="mt-4">
            <div className="flex gap-3 mb-5">
              <button
                onClick={() => setForm(f => ({ ...f, hasPets: true }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  form.hasPets ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                Yes, I have pets
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, hasPets: false }))}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                  !form.hasPets ? "border-primary bg-primary/20 text-primary" : "border-border bg-muted text-muted-foreground hover:border-primary/40"
                }`}
              >
                No pets right now
              </button>
            </div>
            {form.hasPets && (
              <div className="space-y-3">
                {PET_TYPES.map(({ key, label, icon }) => (
                  <div key={key} className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl px-4 py-3">
                    <span className="text-xl w-7 text-center">{icon}</span>
                    <span className="text-sm text-foreground flex-1">{label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setForm(f => ({ ...f, [key]: Math.max(0, ((f as any)[key] || 0) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-sm font-bold"
                      >−</button>
                      <span className="w-6 text-center font-serif font-bold text-foreground text-sm">
                        {(form as any)[key] || 0}
                      </span>
                      <button
                        onClick={() => setForm(f => ({ ...f, [key]: ((f as any)[key] || 0) + 1 }))}
                        className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-sm font-bold"
                      >+</button>
                    </div>
                  </div>
                ))}
                <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xl w-7 text-center">🐾</span>
                    <span className="text-sm text-foreground flex-1">Other pet type</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setForm(f => ({ ...f, petOtherCount: Math.max(0, (f.petOtherCount || 0) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-sm font-bold"
                      >−</button>
                      <span className="w-6 text-center font-serif font-bold text-foreground text-sm">{form.petOtherCount || 0}</span>
                      <button
                        onClick={() => setForm(f => ({ ...f, petOtherCount: (f.petOtherCount || 0) + 1 }))}
                        className="w-7 h-7 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors text-sm font-bold"
                      >+</button>
                    </div>
                  </div>
                  {(form.petOtherCount || 0) > 0 && (
                    <input
                      value={form.petOtherType}
                      onChange={e => setForm(f => ({ ...f, petOtherType: e.target.value }))}
                      placeholder="What kind? (e.g. snake, ferret, hedgehog...)"
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="✦ Soul Excavation"
          subtitle="Deep questions only the brave answer"
          open={openSection === "soul"}
          onToggle={() => toggle("soul")}
        >
          <div className="mt-4 space-y-5">
            {[
              { key: "at3am", q: "What do you think about at 3am?", placeholder: "The thing that won't leave you alone…" },
              { key: "deepFears", q: "What's your deepest fear?", placeholder: "What keeps you up, honestly…" },
              { key: "moonFeeling", q: "How do you feel under the moon?", placeholder: "Describe the feeling…" },
              { key: "movingSong", q: "A song that moves you every time?", placeholder: "Title or describe the feeling it gives…" },
              { key: "comfortFood", q: "What's your comfort food?", placeholder: "No judgment here…" },
              { key: "innerChild", q: "What does your inner child still want?", placeholder: "Something you never outgrew…" },
              { key: "shadowSelf", q: "What's a trait you're still working on?", placeholder: "Your shadow self…" },
              { key: "secretTalent", q: "Your secret talent no one expects?", placeholder: "The one that surprises people…" },
              { key: "mostAlive", q: "When do you feel most alive?", placeholder: "A moment, a place, a state of being…" },
              { key: "neverTell", q: "Something you'd almost never tell anyone?", placeholder: "You're safe here…" },
              { key: "loveLanguage", q: "How do you receive love?", placeholder: "Words, touch, acts, time, gifts…" },
              { key: "triggerWarning", q: "What triggers you instantly?", placeholder: "The thing that gets you every time…" },
              { key: "proudestMoment", q: "Your proudest moment nobody knows about?", placeholder: "A quiet win you never shared…" },
              { key: "cryAbout", q: "What could make you cry right now if you let it?", placeholder: "The thing sitting behind the walls…" },
              { key: "weirdFact", q: "Weirdest true fact about yourself?", placeholder: "The odder the better…" },
              { key: "hiddenSkill", q: "A hidden skill you have?", placeholder: "You'd surprise people with this…" },
              { key: "mysticalBelief", q: "Something mystical you actually believe in?", placeholder: "Even if it sounds odd…" },
              { key: "pastLife", q: "If you had a past life, what was it?", placeholder: "A feeling, a place, a role…" },
              { key: "spiritAnimal", q: "Your spirit animal?", placeholder: "Or the creature you feel in your bones…" },
              { key: "manifestingNow", q: "What are you manifesting right now?", placeholder: "Speak it into existence…" },
              { key: "ifIWereElement", q: "If you were an element, which one?", placeholder: "Fire, water, air, earth, void…" },
              { key: "guiltPleasure", q: "Your guiltiest pleasure?", placeholder: "No shame here…" },
              { key: "whyUseApp", q: "Why are you really on CLAW?", placeholder: "Honest answer only…" },
              { key: "idealDay", q: "Describe your ideal day in detail?", placeholder: "From waking up to going to sleep…" },
            ].map(({ key, q, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-muted-foreground mb-1.5 font-medium">{q}</label>
                <textarea
                  value={(form as any)[key] || ""}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={2}
                  maxLength={300}
                  className="w-full bg-muted border border-border rounded-xl px-3 py-2.5 text-sm text-foreground resize-none focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/40"
                />
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Accessibility ─────────────────────────────────── */}
        <SafeModeSection />

        {/* ── Danger Zone ──────────────────────────────────── */}
        <DeleteAccountSection />

      </div>
    </Layout>
  );
}

function SafeModeSection() {
  const { safeMode, toggleSafeMode } = useSafeMode();
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-foreground">Accessibility</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Adjust visual effects for comfort</p>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Safe Mode</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Disables all animations, glitch effects, and stylized fonts. Improves readability and reduces motion.
          </p>
        </div>
        <button
          onClick={toggleSafeMode}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none ${safeMode ? "bg-primary" : "bg-muted"}`}
          role="switch"
          aria-checked={safeMode}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${safeMode ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </button>
      </div>
      {safeMode && (
        <p className="text-xs text-primary/70 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          Safe mode is active — animations disabled, font simplified
        </p>
      )}
    </div>
  );
}

function DeleteAccountSection() {
  const [step, setStep] = useState(0);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    setError(null);
    try {
      const r = await fetch("/api/account/me", { method: "DELETE", credentials: "include" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Deletion failed");
      window.location.href = "/";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5 space-y-3">
      <div>
        <h3 className="font-semibold text-red-400">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mt-0.5">These actions are permanent and cannot be undone</p>
      </div>

      {step === 0 && (
        <button
          onClick={() => setStep(1)}
          className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 rounded-lg px-4 py-2 transition-all"
        >
          Delete My Account
        </button>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 text-sm text-red-300/90 space-y-2">
            <p className="font-semibold">Before you go — this will permanently:</p>
            <ul className="list-disc pl-4 space-y-1 text-red-300/70 text-xs">
              <li>Delete your profile, posts, and all content</li>
              <li>Remove you from all circles and conversations</li>
              <li>Wipe your GEMZ, SOULZ, and earned badges</li>
              <li>This cannot be reversed</li>
            </ul>
          </div>
          <p className="text-sm text-muted-foreground">Type <span className="font-mono font-bold text-red-400">DELETE</span> to confirm:</p>
          <input
            className="w-full bg-background border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-red-500/60 font-mono"
            placeholder="DELETE"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => { setStep(0); setConfirm(""); }} className="flex-1 px-4 py-2 rounded-xl border border-border text-muted-foreground text-sm hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={confirm !== "DELETE" || deleting}
              className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all"
            >
              {deleting ? "Deleting..." : "Yes, Delete Everything"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
