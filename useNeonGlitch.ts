import { useEffect } from "react";
import { useAuth } from "@workspace/replit-auth-web";

const SOULZ_THRESHOLD = 500;
const GLITCH_CLASS = "neon-glitch-active";

export function useNeonGlitch() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    fetch(`/api/vitals/${user.id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const balance: number = data?.soulzBalance ?? 0;
        const html = document.documentElement;
        if (balance >= SOULZ_THRESHOLD) {
          html.classList.add(GLITCH_CLASS);
        } else {
          html.classList.remove(GLITCH_CLASS);
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [user?.id]);
}
