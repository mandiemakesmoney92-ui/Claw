import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeft, Database, Eye, Share2, Lock, Trash2,
  Server, Smartphone, Globe, UserCheck, Mail, CreditCard,
  MapPin, Mic, Camera, Bell
} from "lucide-react";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "mandiemariemaddox92@gmail.com";
const PLATFORM_NAME = "CLAW – Mystic Kitty Catastrophe";
const DOMAIN = "www.mystichiddengem.com";

export default function DataSafety() {
  useSEO({
    title: "Data Safety",
    description: `What data CLAW collects, how it is used, and how you can control and delete it. Data safety disclosure for ${PLATFORM_NAME}.`,
    canonical: "/data-safety",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="font-bold text-sm">Data Safety</h1>
          <p className="text-xs text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Database className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold">Data Safety</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">
            We believe you deserve to know exactly what data we collect, why we collect it, 
            who can see it, and how to delete it. No fine print. No gotchas.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <span>Effective: {EFFECTIVE_DATE}</span>
            <span>·</span>
            <span>{DOMAIN}</span>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-card/50">
            <div className="font-semibold text-sm flex items-center gap-2 text-blue-400">
              <Eye className="w-4 h-4" />
              Quick Summary
            </div>
          </div>
          <div className="divide-y divide-border">
            {[
              { label: "Data encrypted in transit", value: "Yes — TLS 1.2+" },
              { label: "Data encrypted at rest", value: "Yes" },
              { label: "You can request data deletion", value: "Yes — any time" },
              { label: "Data shared with third parties", value: "Limited — see below" },
              { label: "Data collected for tracking", value: "No" },
              { label: "Data sold to advertisers", value: "Never" },
              { label: "Children under 13 permitted", value: "No — 17+ only" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium text-foreground text-right">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* What we collect */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
            <Database className="w-5 h-5" />
            Data We Collect
          </div>
          <div className="space-y-3">
            {[
              {
                icon: <UserCheck className="w-4 h-4" />,
                title: "Account Information",
                required: true,
                items: ["Username (chosen by you, may be anonymous)", "Email address", "Password (hashed, never stored in plain text)", "Profile display name and bio (optional)", "Profile photo (optional)", "Date of account creation"],
              },
              {
                icon: <Mail className="w-4 h-4" />,
                title: "User-Generated Content",
                required: true,
                items: ["Posts, comments, and reactions you create", "Messages you send to other users or circles", "Circle memberships and roles", "Tarot readings and Magic 8 Ball queries (stored anonymously)", "Soul Excavation profile answers (stored securely, visible only per your privacy settings)", "Masquerade mask selections"],
              },
              {
                icon: <CreditCard className="w-4 h-4" />,
                title: "Payment Information",
                required: false,
                items: ["CLAW does not store payment card numbers", "Payment processing is handled entirely by Stripe (PCI-DSS compliant)", "We receive: transaction ID, amount, currency, and whether payment succeeded", "GEMZ and SOULZ currency balances are stored on our servers"],
              },
              {
                icon: <Smartphone className="w-4 h-4" />,
                title: "Device Information",
                required: true,
                items: ["Browser type and version", "Operating system", "Device type (mobile/desktop)", "IP address (used for security, not stored long-term)", "Session tokens (for keeping you logged in)"],
              },
              {
                icon: <Globe className="w-4 h-4" />,
                title: "Usage Data",
                required: true,
                items: ["Pages and features you visit within CLAW", "Frequency Match compatibility data (shared only with matched users)", "Notification preferences", "Last active timestamp (displayed to connections if you allow it)"],
              },
              {
                icon: <MapPin className="w-4 h-4" />,
                title: "Location (Optional)",
                required: false,
                items: ["Approximate location for local circle discovery (only if you grant permission)", "We never collect or store precise GPS coordinates", "Location permission can be revoked in your device settings at any time"],
              },
              {
                icon: <Camera className="w-4 h-4" />,
                title: "Camera & Microphone (Optional)",
                required: false,
                items: ["Used only for Live Video feature when you choose to go live", "Video/audio streams are not stored on our servers by default", "Recording a stream requires explicit consent from the host"],
              },
              {
                icon: <Bell className="w-4 h-4" />,
                title: "Notifications (Optional)",
                required: false,
                items: ["Push notification tokens (if you enable notifications)", "Notification preferences and opt-outs", "You can disable all notifications at any time"],
              },
            ].map((section) => (
              <div key={section.title} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <span className="text-blue-400">{section.icon}</span>
                    {section.title}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${section.required ? "bg-violet-500/15 text-violet-400" : "bg-muted text-muted-foreground"}`}>
                    {section.required ? "Required" : "Optional"}
                  </span>
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-violet-400 mt-0.5">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* How we use it */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-violet-400">
            <Eye className="w-5 h-5" />
            How We Use Your Data
          </div>
          <div className="space-y-3">
            {[
              { heading: "To run the platform", body: "Account management, posting, messaging, circle participation, payments — the core functions of CLAW." },
              { heading: "To keep you safe", body: "Detecting and preventing fraud, spam, abuse, and security threats. IP addresses are temporarily logged for this purpose." },
              { heading: "To personalize your experience", body: "Frequency Match compatibility scoring, recommended circles, and Ringy AI responses are personalized based on your activity and profile." },
              { heading: "To send notifications", body: "Alerts for replies, messages, circle activity, and platform updates — only if you have notifications enabled." },
              { heading: "To improve CLAW", body: "Aggregate, anonymized usage statistics help us understand which features are working. We do not build individual behavioral profiles." },
              { heading: "To process payments", body: "Purchase history, currency balances, and transaction records for GEMZ and SOULZ purchases and App Store transactions." },
            ].map((item) => (
              <div key={item.heading} className="bg-card border border-border rounded-xl p-4 space-y-1">
                <div className="font-semibold text-sm">{item.heading}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Third-party sharing */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-orange-400">
            <Share2 className="w-5 h-5" />
            Data Shared with Third Parties
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {[
                { name: "Stripe", purpose: "Payment processing", data: "Transaction metadata only (no card numbers)", link: "https://stripe.com/privacy" },
                { name: "ElevenLabs", purpose: "Ringy AI voice generation", data: "Text prompts sent for TTS generation (not linked to your account)", link: "https://elevenlabs.io/privacy" },
                { name: "OpenAI", purpose: "AI companion responses", data: "Message text for generating responses", link: "https://openai.com/privacy" },
                { name: "Neon (PostgreSQL)", purpose: "Database hosting", data: "All stored user data (secured, not used by Neon)", link: "https://neon.tech/privacy" },
                { name: "Law Enforcement", purpose: "Legal compliance", data: "Only when legally required by valid court order", link: null },
              ].map((row) => (
                <div key={row.name} className="px-4 py-3 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{row.name}</span>
                    {row.link && (
                      <a href={row.link} target="_blank" rel="noreferrer" className="text-xs text-violet-400 hover:underline">Privacy Policy →</a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{row.purpose} — {row.data}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">We do not sell your data. We do not share your data with advertisers. We do not use your data for ad targeting.</p>
        </div>

        {/* Retention & Deletion */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-teal-400">
            <Trash2 className="w-5 h-5" />
            Data Retention & Deletion
          </div>
          <div className="space-y-3">
            {[
              { heading: "Account data", body: "Retained while your account is active. Deleted within 30 days of account deletion request, except where legal holds apply." },
              { heading: "Posts and content", body: "Deleted when you delete them or when your account is deleted. Cached copies may persist briefly in CDN for up to 72 hours." },
              { heading: "Messages", body: "Stored while your account is active. You may delete individual messages. Full message history is deleted when your account is deleted." },
              { heading: "Payment records", body: "Transaction records are retained for 7 years as required by financial regulations, even after account deletion." },
              { heading: "Security logs", body: "IP addresses and login events are retained for 90 days for security investigation purposes, then automatically purged." },
              { heading: "How to delete your account", body: "Go to Settings → Account → Delete Account. You'll be asked to confirm. Deletion is permanent and irreversible." },
            ].map((item) => (
              <div key={item.heading} className="bg-card border border-border rounded-xl p-4 space-y-1">
                <div className="font-semibold text-sm">{item.heading}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Your rights */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-green-400">
            <Lock className="w-5 h-5" />
            Your Rights
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-3 text-sm text-muted-foreground">
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="space-y-2">
              {[
                "Access a copy of the personal data we hold about you",
                "Correct inaccurate data",
                "Request deletion of your data (\"right to be forgotten\")",
                "Object to or restrict certain processing",
                "Data portability — receive your data in a machine-readable format",
                "Withdraw consent at any time where processing is based on consent",
                "Lodge a complaint with your local data protection authority",
              ].map((right) => (
                <li key={right} className="flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {right}
                </li>
              ))}
            </ul>
            <p>
              To exercise any of these rights, email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>{" "}
              with the subject line "Data Rights Request". We respond within 30 days.
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-lg text-blue-400">
            <Server className="w-5 h-5" />
            Security Measures
          </div>
          <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {[
                "All data in transit encrypted via TLS 1.2+",
                "Passwords hashed using bcrypt with salt rounds",
                "Database encrypted at rest",
                "Session tokens use secure, httpOnly cookies",
                "Payment data handled exclusively by Stripe (PCI-DSS Level 1)",
                "Regular security audits and dependency updates",
                "Server infrastructure hosted in the United States",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-blue-400 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">Questions about your data?</p>
          <p>
            Contact our privacy team at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
            We aim to respond within 5 business days.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground pt-4 border-t border-border">
          <Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></Link>
          <span>·</span>
          <Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></Link>
          <span>·</span>
          <Link href="/safety"><span className="hover:text-foreground transition-colors cursor-pointer">Safety Standards</span></Link>
          <span>·</span>
          <Link href="/report"><span className="hover:text-foreground transition-colors cursor-pointer">Report Abuse</span></Link>
        </div>
      </div>
    </div>
  );
}
