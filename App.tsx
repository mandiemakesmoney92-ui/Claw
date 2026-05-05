import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import { ClerkProvider, SignIn, SignUp } from "@clerk/react";
import { dark } from "@clerk/themes";
import { useState, useEffect, Component, type ErrorInfo, type ReactNode } from "react";

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("[CLAW CRASH]", error, info.componentStack); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#07070d", color: "#f87171", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "monospace", textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>✦ CLAW crashed</div>
          <div style={{ fontSize: "0.85rem", color: "#fca5a5", marginBottom: "0.5rem", maxWidth: 600 }}>{this.state.error.message}</div>
          <details style={{ marginTop: "1rem", color: "#71717a", fontSize: "0.75rem", maxWidth: 700, textAlign: "left" }}>
            <summary style={{ cursor: "pointer", color: "#a78bfa" }}>Stack trace</summary>
            <pre style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem" }}>{this.state.error.stack}</pre>
          </details>
          <button onClick={() => window.location.reload()} style={{ marginTop: "2rem", padding: "0.5rem 1.5rem", background: "#7c3aed", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import { unlockAudio } from "@/lib/audio";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import NotFound from "@/pages/not-found";
import Welcome from "@/pages/welcome";
import Feed from "@/pages/feed";
import Trending from "@/pages/trending";
import Broadcasts from "@/pages/broadcasts";
import Messages from "@/pages/messages";
import Confessions from "@/pages/confessions";
import Circles from "@/pages/circles";
import Notifications from "@/pages/notifications";
import Contests from "@/pages/contests";
import Creator from "@/pages/creator";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import SearchPage from "@/pages/search";
import Reels from "@/pages/reels";
import ComplimentWheel from "@/pages/compliment-wheel";
import Onboarding from "@/pages/onboarding";
import Shop from "@/pages/shop";
import CheckoutSuccess from "@/pages/checkout-success";
import PurgeArena from "@/pages/purge-arena";
import AppStorePage from "@/pages/app-store";
import Terms from "@/pages/terms";
import About from "@/pages/about";
import Privacy from "@/pages/privacy";
import PurgatoryPage from "@/pages/purgatory";
import ShadowWork from "@/pages/shadow-work";
import HumanityVerify from "@/pages/humanity-verify";
import TarotPage from "@/pages/tarot";
import Magic8BallPage from "@/pages/magic8ball";
import ShoutoutsPage from "@/pages/shoutouts";
import LivePage from "@/pages/live";
import GuidePage from "@/pages/guide";
import BetsPage from "@/pages/bets";
import FrequencyMatchPage from "@/pages/frequency-match";
import MasqueradePage from "@/pages/masquerade";
import WorldPage from "@/pages/world";
import PranksPage from "@/pages/pranks";
import ReferralsPage from "@/pages/referrals";
import MembershipPage from "@/pages/membership";
import { FollowersListPage, FollowingListPage } from "@/pages/followers";
import { SafeModeProvider } from "@/contexts/SafeModeContext";
import { CallProvider } from "@/contexts/CallContext";
import { RingyProvider } from "@/contexts/RingyContext";
import { CursorProvider } from "@/components/CursorProvider";
import SafetyPage from "@/pages/safety";
import DataSafetyPage from "@/pages/data-safety";
import ReportPage from "@/pages/report";
import GhostLettersPage from "@/pages/ghost-letters";
import WitnessWall from "@/pages/witness-wall";
import PenPalsPage from "@/pages/pen-pals";
import MirrorMomentModal from "@/components/MirrorMomentModal";
import RingyTutorialModal from "@/components/RingyTutorialModal";
import CosmicBackground from "@/components/CosmicBackground";
import GlitchCanvas from "@/pages/glitch-canvas";
import AdminVibePage from "@/pages/admin-vibe";
import { useNeonGlitch } from "@/hooks/useNeonGlitch";
import { CooldownProvider } from "@/contexts/CooldownContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    }
  }
});

function MainApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [location] = useLocation();

  usePushNotifications();
  useNeonGlitch();

  // Unlock audio on first user interaction so all TTS plays work from async callbacks
  useEffect(() => {
    const handler = () => {
      unlockAudio().catch(() => {});
      document.removeEventListener("click", handler, true);
      document.removeEventListener("touchstart", handler, true);
      document.removeEventListener("keydown", handler, true);
    };
    document.addEventListener("click", handler, true);
    document.addEventListener("touchstart", handler, true);
    document.addEventListener("keydown", handler, true);
    return () => {
      document.removeEventListener("click", handler, true);
      document.removeEventListener("touchstart", handler, true);
      document.removeEventListener("keydown", handler, true);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const done = localStorage.getItem("claw_onboarded") === "1";
      setOnboarded(done);
      const tutorialSeen = localStorage.getItem("claw_tutorial_seen") === "1";
      if (done && !tutorialSeen) {
        const t = setTimeout(() => setShowTutorial(true), 1200);
        return () => clearTimeout(t);
      }
    }
    return undefined;
  }, [isAuthenticated]);

  // Public routes — accessible without login (must be after all hooks)
  if (location === "/terms") return <Terms />;
  if (location === "/about") return <About />;
  if (location === "/privacy") return <Privacy />;
  if (location === "/safety") return <SafetyPage />;
  if (location === "/data-safety") return <DataSafetyPage />;
  if (location === "/report") return <ReportPage />;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Welcome />;
  }

  if (isAuthenticated && onboarded === false) {
    return <Onboarding onComplete={() => setOnboarded(true)} />;
  }

  if (onboarded === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
      <MirrorMomentModal />
      {showTutorial && (
        <RingyTutorialModal onDone={() => setShowTutorial(false)} />
      )}
      <Switch>
      <Route path="/">
        <Redirect to="/feed" />
      </Route>
      <Route path="/feed" component={Feed} />
      <Route path="/search" component={SearchPage} />
      <Route path="/reels" component={Reels} />
      <Route path="/trending" component={Trending} />
      <Route path="/broadcasts" component={Broadcasts} />
      <Route path="/messages" component={Messages} />
      <Route path="/confessions" component={Confessions} />
      <Route path="/circles" component={Circles} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/contests" component={Contests} />
      <Route path="/creator" component={Creator} />
      <Route path="/compliment-wheel" component={ComplimentWheel} />
      <Route path="/profile/:id" component={Profile} />
      <Route path="/profile-edit" component={ProfileEdit} />
      <Route path="/shop" component={Shop} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/purge-arena" component={PurgeArena} />
      <Route path="/app-store" component={AppStorePage} />
      <Route path="/purgatory" component={PurgatoryPage} />
      <Route path="/shadow-work" component={ShadowWork} />
      <Route path="/humanity-verify" component={HumanityVerify} />
      <Route path="/terms" component={Terms} />
      <Route path="/about" component={About} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/tarot" component={TarotPage} />
      <Route path="/magic8" component={Magic8BallPage} />
      <Route path="/shoutouts" component={ShoutoutsPage} />
      <Route path="/live" component={LivePage} />
      <Route path="/guide" component={GuidePage} />
      <Route path="/bets" component={BetsPage} />
      <Route path="/frequency-match" component={FrequencyMatchPage} />
      <Route path="/masquerade" component={MasqueradePage} />
      <Route path="/world" component={WorldPage} />
      <Route path="/pranks" component={PranksPage} />
      <Route path="/referrals" component={ReferralsPage} />
      <Route path="/membership" component={MembershipPage} />
      <Route path="/profile/:userId/followers" component={FollowersListPage} />
      <Route path="/profile/:userId/following" component={FollowingListPage} />
      <Route path="/safety" component={SafetyPage} />
      <Route path="/data-safety" component={DataSafetyPage} />
      <Route path="/report" component={ReportPage} />
      <Route path="/ghost-letters" component={GhostLettersPage} />
      <Route path="/witness-wall" component={WitnessWall} />
      <Route path="/pen-pals" component={PenPalsPage} />
      <Route path="/glitch-canvas" component={GlitchCanvas} />
      <Route path="/admin/vibe" component={AdminVibePage} />
      <Route component={NotFound} />
    </Switch>
    </>
  );
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "") || "";

// Clerk passes full paths to routerPush/routerReplace, but wouter's
// setLocation prepends the base — strip it to avoid doubling.
function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  layout: {
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    logoPlacement: "inside" as const,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#9333ea",
    colorBackground: "#07070d",
    colorForeground: "#f3e8ff",
    colorMutedForeground: "#a78bfa",
    colorInput: "#12122a",
    colorInputForeground: "#f3e8ff",
    colorNeutral: "#3b1f6a",
    fontFamily: "Georgia, serif",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "!bg-transparent",
    cardBox: "bg-[#07070d] border border-purple-900/40 shadow-[0_0_60px_rgba(109,40,217,0.25)] rounded-2xl",
    headerTitle: "text-purple-100 font-bold tracking-wide",
    headerSubtitle: "text-purple-300/70",
    socialButtonsBlockButton: "bg-white/[0.06] border border-purple-900/40 text-purple-100 hover:bg-white/[0.1] hover:border-purple-500/50 transition-all duration-300",
    socialButtonsBlockButtonText: "text-purple-100 font-medium",
    dividerLine: "bg-purple-900/30",
    dividerText: "text-purple-400/50 text-xs",
    formFieldLabel: "text-purple-200/80 text-sm",
    formFieldInput: "bg-white/[0.06] border-purple-900/40 text-purple-100 focus:border-purple-500 focus:ring-purple-500/30 placeholder-purple-400/30",
    formButtonPrimary: "bg-gradient-to-r from-purple-700 to-violet-600 hover:from-purple-600 hover:to-violet-500 text-white font-semibold shadow-[0_0_30px_rgba(109,40,217,0.4)] transition-all duration-300",
    footerActionLink: "text-purple-400 hover:text-purple-300",
    footerActionText: "text-purple-400/60",
    identityPreviewText: "text-purple-200",
    identityPreviewEditButton: "text-purple-400",
    alternativeMethodsBlockButton: "bg-white/[0.04] border border-purple-900/30 text-purple-300 hover:bg-white/[0.07]",
    otpCodeFieldInput: "bg-white/[0.06] border-purple-900/40 text-purple-100",
    badge: "bg-purple-900/50 text-purple-300",
    footerAction: "!hidden",
    footer: "!hidden",
  },
};

const BackChevron = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ─── Shared auth page shell with Ringy background ────────── */
function AuthPageShell({
  headline, subline, badge, badgeColor = "bg-purple-400", children, bottomText, bottomAction, bottomActionLabel,
}: {
  headline: string;
  subline: string;
  badge: string;
  badgeColor?: string;
  children: React.ReactNode;
  bottomText: string;
  bottomAction: () => void;
  bottomActionLabel: string;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex bg-[#07070d] overflow-hidden">

      {/* ── Left panel: Ringy ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col items-center justify-end overflow-hidden">
        {/* full-bleed image */}
        <img
          src={`${basePath}/ringy-bg.png`}
          alt="Ringy"
          className="absolute inset-0 w-full h-full object-cover object-top"
          style={{ filter: "brightness(0.88) saturate(1.15)" }}
        />
        {/* gradient vignette fading right into the form panel */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to right, transparent 55%, #07070d 100%)",
        }} />
        {/* bottom text fade */}
        <div className="absolute inset-0" style={{
          background: "linear-gradient(to top, rgba(7,7,13,0.85) 0%, transparent 40%)",
        }} />
        {/* Ringy label */}
        <div className="relative z-10 mb-10 text-center px-8">
          <p className="text-[10px] text-purple-300/40 uppercase tracking-[0.35em] mb-1">RINGY</p>
          <p className="text-white/20 text-xs italic font-light">she's always watching</p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-5 py-12 overflow-y-auto">
        {/* Mobile: Ringy as blurred background */}
        <div className="lg:hidden absolute inset-0 z-0">
          <img
            src={`${basePath}/ringy-bg.png`}
            alt=""
            className="w-full h-full object-cover object-top opacity-15"
            style={{ filter: "blur(2px) brightness(0.6) saturate(1.3)" }}
          />
          <div className="absolute inset-0 bg-[#07070d]/80" />
        </div>

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
          {/* Back */}
          <button
            onClick={() => navigate("/")}
            className="self-start flex items-center gap-1.5 text-sm text-purple-300/50 hover:text-purple-200 transition-colors mb-8"
          >
            <BackChevron />
            Back
          </button>

          {/* CLAW wordmark */}
          <div className="mb-1 text-3xl font-black font-serif tracking-tight"
            style={{
              background: "linear-gradient(135deg, #e9d5ff 0%, #c084fc 50%, #9333ea 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 24px rgba(168,85,247,0.5))",
            }}>
            CLAW
          </div>

          {/* headline */}
          <p className="text-purple-100/75 text-sm font-serif font-medium tracking-wide mb-1 text-center">{headline}</p>

          {/* badge / social proof */}
          <div className="flex items-center gap-1.5 mb-6">
            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${badgeColor}`} />
            <span className="text-[11px] text-white/38">{badge}</span>
          </div>
          <p className="text-[10px] text-white/18 tracking-widest uppercase mb-4">{subline}</p>

          {/* Clerk widget */}
          {children}

          {/* bottom link */}
          <p className="mt-5 text-xs text-white/28 text-center">
            {bottomText}{" "}
            <button onClick={bottomAction} className="text-purple-400 hover:text-purple-300 transition-colors underline-offset-2 hover:underline">
              {bottomActionLabel}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// To update login providers (Google, Email, etc.), app name and icon, visit the Auth pane in the workspace toolbar.
function ClerkSignInPage() {
  const [, navigate] = useLocation();
  return (
    <AuthPageShell
      headline="Welcome back to the void."
      subline="No ads · No algorithm · Free forever"
      badge="64,745 active members can't be wrong"
      badgeColor="bg-green-400"
      bottomText="New to CLAW?"
      bottomAction={() => navigate("/sign-up")}
      bottomActionLabel="Create a free account"
    >
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={clerkAppearance}
      />
    </AuthPageShell>
  );
}

function ClerkSignUpPage() {
  const [, navigate] = useLocation();
  return (
    <AuthPageShell
      headline="Stop performing. Start existing."
      subline="No ads · No algorithm · Free forever"
      badge="Join 64,745 members already in the void"
      badgeColor="bg-purple-400"
      bottomText="Already on CLAW?"
      bottomAction={() => navigate("/sign-in")}
      bottomActionLabel="Sign in"
    >
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/`}
        appearance={clerkAppearance}
      />
    </AuthPageShell>
  );
}

function ClerkProviderWithRouter({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const proxyUrl = import.meta.env.VITE_CLERK_PROXY_URL || undefined;

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      proxyUrl={proxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={`${basePath}/`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRouter>
        <SafeModeProvider>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Switch>
                <Route path="/sign-in/*?" component={ClerkSignInPage} />
                <Route path="/sign-up/*?" component={ClerkSignUpPage} />
                <Route>
                  <CursorProvider>
                    <RingyProvider>
                      <CooldownProvider>
                        <CosmicBackground />
                        <CallProvider>
                          <MainApp />
                        </CallProvider>
                      </CooldownProvider>
                    </RingyProvider>
                  </CursorProvider>
                </Route>
              </Switch>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </SafeModeProvider>
      </ClerkProviderWithRouter>
    </WouterRouter>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
