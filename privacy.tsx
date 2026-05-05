import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { ArrowLeft, Lock, Eye, Database, Share2, UserCheck, Mail, Globe } from "lucide-react";

const EFFECTIVE_DATE = "April 5, 2026";
const CONTACT_EMAIL = "mandiemariemaddox92@gmail.com";
const PLATFORM_NAME = "CLAW – Mystic Kitty Catastrophe";
const DOMAIN = "www.mystichiddengem.com";

export default function Privacy() {
  useSEO({
    title: "Privacy Policy",
    description: `How CLAW collects, uses, and protects your personal data. Privacy policy for ${PLATFORM_NAME}.`,
    canonical: "/privacy",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <span className="text-white/30 text-sm font-medium">CLAW · Privacy Policy</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10 text-white/80">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> Privacy
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">Privacy Policy</h1>
          <p className="text-white/40 text-sm">Effective: {EFFECTIVE_DATE} · {DOMAIN}</p>
        </div>

        <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 text-sm text-white/60 leading-relaxed">
          Your privacy matters here. This policy explains what we collect, why we collect it, and how you can control it. We don't sell your data. We don't run ads. We run a platform.
        </div>

        <Section icon={<Eye className="w-4 h-4" />} title="1. Information We Collect">
          <p><strong className="text-white">Information you provide directly:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Account details — display name, username, bio, profile photo, banner</li>
            <li>Content you post — text posts, confessions, photos, audio, videos, dreams, graffiti</li>
            <li>Messages and interactions — direct messages, reactions, tips, circle memberships</li>
            <li>Profile preferences — zodiac sign, MBTI type, interaction level, pets, themes</li>
          </ul>

          <p className="mt-3"><strong className="text-white">Information collected automatically:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Profile visit data — when you view someone's profile (used for the heartbeat visitor feature)</li>
            <li>Session information — login timestamps and authentication state</li>
            <li>Device and browser type — for basic functionality and security</li>
            <li>IP address — for fraud prevention and abuse detection only</li>
          </ul>

          <p className="mt-3"><strong className="text-white">Information from third-party services:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Authentication data via Replit Auth (name, email) when you log in</li>
            <li>Payment processing data via Stripe — we do not store your card details; Stripe handles all payment security</li>
          </ul>
        </Section>

        <Section icon={<Database className="w-4 h-4" />} title="2. How We Use Your Information">
          <p>We use the information we collect to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Operate and maintain the Platform and its features</li>
            <li>Display your profile, posts, and content to others as you've configured</li>
            <li>Process CLAW Coin purchases and tip transactions through Stripe</li>
            <li>Enable social features — circles, confessions, reactions, compliments, graffiti</li>
            <li>Power interaction-level controls and consent-based visibility settings</li>
            <li>Provide the profile visitor / heartbeat feature to profile owners</li>
            <li>Enforce our Terms of Service and Community Guidelines</li>
            <li>Respond to DMCA takedown requests and legal inquiries</li>
            <li>Improve and debug Platform features</li>
          </ul>
          <p className="mt-3">We do <strong className="text-white">not</strong> use your information to run ads, sell data to data brokers, or build advertising profiles.</p>
        </Section>

        <Section icon={<Share2 className="w-4 h-4" />} title="3. How We Share Your Information">
          <p>We do not sell, rent, or trade your personal information. We share data only in these limited circumstances:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li><strong className="text-white">With other users</strong> — content you post publicly is visible to other users according to your privacy settings and interaction level</li>
            <li><strong className="text-white">Stripe</strong> — payment data for processing CLAW Coin purchases; governed by <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Stripe's Privacy Policy</a></li>
            <li><strong className="text-white">Replit Auth</strong> — authentication is handled by Replit; governed by <a href="https://replit.com/privacy" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Replit's Privacy Policy</a></li>
            <li><strong className="text-white">Legal compliance</strong> — if required by law, court order, or to protect the safety of our users or the public</li>
            <li><strong className="text-white">DMCA takedowns</strong> — we may forward takedown notices to the uploader as required by law</li>
          </ul>
        </Section>

        <Section icon={<Lock className="w-4 h-4" />} title="4. Consent-Based Platform">
          <p>CLAW is built on consent. This means:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li>Confessions are anonymous by default — you choose whether to reveal your identity</li>
            <li>Interaction levels (Soft, Direct, Claw) control how people can engage with you</li>
            <li>Circles control who can see certain content — inner circle, network, opposition</li>
            <li>Anonymous Purge Arena posts cannot be traced back to you by other users</li>
            <li>You can block any user, removing their access to your profile and content</li>
          </ul>
          <p className="mt-3">We are committed to honoring these consent settings in how we operate the Platform.</p>
        </Section>

        <Section icon={<Database className="w-4 h-4" />} title="5. Data Retention">
          <p>We retain your data for as long as your account is active. If you delete your account:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li>Your profile, posts, and personal data will be deleted from our active systems</li>
            <li>Some data may be retained in backups for up to 90 days before permanent deletion</li>
            <li>Transaction records may be retained as required by financial regulations</li>
            <li>Content flagged in an active legal process may be retained until resolution</li>
          </ul>
          <p className="mt-3">Purge Arena posts auto-delete after 24 hours by design. Dream entries and albums are deleted when you delete your account.</p>
        </Section>

        <Section icon={<Globe className="w-4 h-4" />} title="6. Cookies & Local Storage">
          <p>CLAW uses:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li><strong className="text-white">Session cookies</strong> — to keep you logged in securely</li>
            <li><strong className="text-white">Local storage</strong> — to remember onboarding completion and UI preferences (e.g., theme)</li>
          </ul>
          <p className="mt-3">We do not use tracking cookies, advertising cookies, or third-party analytics cookies. No third-party ad networks operate on this Platform.</p>
        </Section>

        <Section icon={<UserCheck className="w-4 h-4" />} title="7. Your Rights">
          <p>Depending on your location, you may have the following rights regarding your personal data:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li><strong className="text-white">Access</strong> — request a copy of the data we hold about you</li>
            <li><strong className="text-white">Correction</strong> — update inaccurate personal information (via Profile Edit)</li>
            <li><strong className="text-white">Deletion</strong> — request deletion of your account and associated data</li>
            <li><strong className="text-white">Portability</strong> — request an export of your content</li>
            <li><strong className="text-white">Objection</strong> — object to certain uses of your data</li>
          </ul>
          <p className="mt-3">California residents have additional rights under the CCPA, including the right to know and the right to opt out of sale (we do not sell data). EU/UK residents have rights under GDPR.</p>
          <p className="mt-2">To exercise any right, email us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:text-purple-300">{CONTACT_EMAIL}</a>. We will respond within 30 days.</p>
        </Section>

        <Section icon={<Lock className="w-4 h-4" />} title="8. Security">
          <p>We take reasonable technical and organizational measures to protect your data, including:</p>
          <ul className="list-disc list-inside space-y-1 pl-2 mt-2">
            <li>HTTPS encryption on all data in transit</li>
            <li>Secure session management with HTTP-only cookies</li>
            <li>Password-less authentication (no passwords stored)</li>
            <li>Payment data handled exclusively by Stripe (PCI compliant)</li>
          </ul>
          <p className="mt-3">No system is 100% secure. If you discover a security vulnerability, please report it to <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:text-purple-300">{CONTACT_EMAIL}</a> responsibly.</p>
        </Section>

        <Section icon={<UserCheck className="w-4 h-4" />} title="9. Children's Privacy">
          <p>CLAW is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we discover that a child under 13 has provided personal information, we will delete it immediately. If you are a parent or guardian and believe your child has used CLAW, please contact us.</p>
        </Section>

        <Section icon={<Mail className="w-4 h-4" />} title="10. Changes to This Policy">
          <p>We may update this Privacy Policy from time to time. We will notify users of material changes by posting a notice on the Platform. Continued use after changes are posted constitutes acceptance.</p>
        </Section>

        <Section icon={<Mail className="w-4 h-4" />} title="11. Contact">
          <p>For privacy requests, data deletions, or questions about this policy:</p>
          <div className="mt-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
            <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:text-purple-300 text-sm font-medium">{CONTACT_EMAIL}</a>
          </div>
        </Section>

        <p className="text-center text-white/25 text-xs pt-4 border-t border-border">
          © {new Date().getFullYear()} {PLATFORM_NAME} · {DOMAIN} · All rights reserved
        </p>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <span className="text-purple-400">{icon}</span>
        <h2 className="font-serif font-semibold text-white text-base">{title}</h2>
      </div>
      <div className="space-y-3 text-sm leading-relaxed text-white/65 pl-1">
        {children}
      </div>
    </div>
  );
}
