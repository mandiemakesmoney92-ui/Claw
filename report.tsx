import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeft, Flag, AlertTriangle, Shield, UserX,
  MessageSquare, Eye, Phone, Mail, ExternalLink
} from "lucide-react";

const CONTACT_EMAIL = "mandiemariemaddox92@gmail.com";
const PLATFORM_NAME = "CLAW – Mystic Kitty Catastrophe";

interface ReportType {
  icon: React.ReactNode;
  title: string;
  description: string;
  urgency: "immediate" | "standard" | "info";
  action: string;
  actionLink?: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Immediate Danger / Emergency",
    description: "Someone is in immediate physical danger, threatening self-harm, or threatening others.",
    urgency: "immediate",
    action: "Call 911 immediately. Then email us.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=URGENT: Safety Emergency&body=Please describe the situation and provide any relevant usernames or post links.`,
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Child Safety / CSAM",
    description: "Content that sexually exploits or endangers minors in any way.",
    urgency: "immediate",
    action: "Report to NCMEC CyberTipline",
    actionLink: "https://www.missingkids.org/gethelpnow/cybertipline",
  },
  {
    icon: <UserX className="w-5 h-5" />,
    title: "Harassment or Threats",
    description: "Someone is threatening, stalking, doxxing, or persistently harassing you or another user.",
    urgency: "standard",
    action: "Use in-app Report button on the offending profile or post, then email us.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=Harassment Report&body=Username of offender:%0ADescription of behavior:%0ALinks to posts (if any):`,
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Non-Consensual Intimate Imagery",
    description: "Intimate images shared without the consent of the person in them, including deepfakes.",
    urgency: "immediate",
    action: "Email us immediately — we act on these within hours.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=URGENT: Non-Consensual Content&body=Please describe the content and provide any post links or usernames.`,
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Hate Speech or Discrimination",
    description: "Content that dehumanizes people based on identity — race, religion, gender, orientation, disability.",
    urgency: "standard",
    action: "Use in-app Report button, or email us with a link to the content.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=Hate Speech Report&body=Link to content:%0ADescription:`,
  },
  {
    icon: <Flag className="w-5 h-5" />,
    title: "Spam or Scams",
    description: "Fake accounts, mass-spam messages, phishing links, or financial scam attempts.",
    urgency: "standard",
    action: "Use in-app Report button on the account or message.",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Impersonation",
    description: "Someone pretending to be you, another real person, or a brand/organization.",
    urgency: "standard",
    action: "Email us with your real account username and the impersonating account's username.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=Impersonation Report&body=My username:%0AImpersonating account username:%0AProof of identity (describe):`,
  },
  {
    icon: <AlertTriangle className="w-5 h-5" />,
    title: "Self-Harm or Suicide Content",
    description: "Content providing methods, encouraging, or glorifying self-harm or suicide.",
    urgency: "immediate",
    action: "Email us immediately. If someone is in crisis, contact 988.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=URGENT: Self-Harm Content&body=Link to content:%0ADescription:`,
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Privacy Violation / Doxxing",
    description: "Someone has shared your private personal information (address, phone, workplace) without consent.",
    urgency: "immediate",
    action: "Email us immediately with the post link — we will remove it within hours.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=URGENT: Privacy Violation&body=Link to post:%0AWhat information was shared:`,
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Misinformation",
    description: "Content that contains dangerous false information (medical misinformation, false emergencies, etc.)",
    urgency: "standard",
    action: "Use in-app Report button, select 'Misinformation.'",
  },
  {
    icon: <Flag className="w-5 h-5" />,
    title: "Intellectual Property",
    description: "Your copyrighted content is being used without permission.",
    urgency: "info",
    action: "Email us a DMCA takedown notice.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=DMCA Takedown Request&body=Your name:%0AYour contact information:%0ADescription of copyrighted work:%0ALink to infringing content:%0AStatement of good faith belief:`,
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Law Enforcement / Legal Request",
    description: "Legal process, preservation requests, or law enforcement inquiries.",
    urgency: "info",
    action: "Email our legal team with your official credentials.",
    actionLink: `mailto:${CONTACT_EMAIL}?subject=Law Enforcement Request`,
  },
];

const URGENCY_CONFIG = {
  immediate: { label: "Act Now", color: "bg-red-500/15 text-red-400 border-red-500/20", dot: "bg-red-400" },
  standard: { label: "24–72 hrs", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
  info: { label: "Standard", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
};

export default function Report() {
  useSEO({
    title: "Report Abuse",
    description: `Report harmful content, harassment, or safety violations on ${PLATFORM_NAME}. We review all reports.`,
    canonical: "/report",
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
          <h1 className="font-bold text-sm">Report Center</h1>
          <p className="text-xs text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <Flag className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold">Report Center</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">
            Every report is reviewed by a real human on our moderation team. Your report is confidential — 
            the person you report is never told who reported them.
          </p>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 font-semibold text-red-400 mb-2">
            <Phone className="w-4 h-4" />
            Immediate Emergency?
          </div>
          <p className="text-sm text-muted-foreground">
            If someone is in immediate physical danger, <strong className="text-foreground">call 911</strong>. 
            For mental health crisis, <strong className="text-foreground">call or text 988</strong>.{" "}
            <a href="https://findahelpline.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">
              International crisis resources →
            </a>
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <div className="font-semibold text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-400" />
            Fastest Way to Report In-App
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tap the <strong className="text-foreground">⋮ menu</strong> on any post, comment, message, or profile 
            and select <strong className="text-foreground">"Report"</strong>. Choose a reason and submit. 
            Our team is notified immediately.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Report by Type</h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Act Now</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 24–72 hrs</span>
            </div>
          </div>

          {REPORT_TYPES.map((report) => {
            const urg = URGENCY_CONFIG[report.urgency];
            return (
              <div key={report.title} className="bg-card border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{report.icon}</span>
                    <span className="font-semibold text-sm">{report.title}</span>
                  </div>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${urg.color}`}>
                    {urg.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{report.description}</p>
                {report.actionLink ? (
                  <a
                    href={report.actionLink}
                    target={report.actionLink.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {report.action}
                  </a>
                ) : (
                  <p className="text-xs text-violet-400 font-medium">{report.action}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4 text-violet-400" />
            Direct Email Reports
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any report not covered above, or if you need to send screenshots or additional evidence, 
            email our moderation team directly:
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Safety Report`}
            className="flex items-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold transition-colors justify-center"
          >
            <Mail className="w-4 h-4" />
            {CONTACT_EMAIL}
          </a>
          <p className="text-xs text-muted-foreground text-center">
            Include: your username, the offending username or post link, and a description of the violation.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">What happens after you report?</p>
          <ul className="space-y-1.5">
            {[
              "You receive a confirmation that your report was received",
              "A human moderator reviews your report within 24–72 hours (urgent reports sooner)",
              "Action is taken if the content violates our Safety Standards",
              "You may receive a follow-up if more information is needed",
              "The reported user is never told who filed the report",
            ].map((step, i) => (
              <li key={step} className="flex items-start gap-2">
                <span className="text-violet-400 font-bold shrink-0">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground pt-4 border-t border-border">
          <Link href="/safety"><span className="hover:text-foreground transition-colors cursor-pointer">Safety Standards</span></Link>
          <span>·</span>
          <Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></Link>
          <span>·</span>
          <Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></Link>
          <span>·</span>
          <Link href="/data-safety"><span className="hover:text-foreground transition-colors cursor-pointer">Data Safety</span></Link>
        </div>
      </div>
    </div>
  );
}
