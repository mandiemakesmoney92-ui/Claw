import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import {
  ArrowLeft, Shield, AlertTriangle, Ban, Eye, Heart,
  UserX, Flag, Lock, MessageSquare, Swords, Users
} from "lucide-react";

const EFFECTIVE_DATE = "April 14, 2026";
const CONTACT_EMAIL = "mandiemariemaddox92@gmail.com";
const PLATFORM_NAME = "CLAW – Mystic Kitty Catastrophe";
const DOMAIN = "www.mystichiddengem.com";

interface Section {
  icon: React.ReactNode;
  title: string;
  color: string;
  items: { heading: string; body: string }[];
}

const SECTIONS: Section[] = [
  {
    icon: <Shield className="w-5 h-5" />,
    title: "Our Safety Commitment",
    color: "text-violet-400",
    items: [
      {
        heading: "Consent First, Always",
        body: "CLAW is built on the principle of consent. Every feature — circles, messaging, matching, live video — requires affirmative action from the user. Nothing happens to you without your knowledge and approval.",
      },
      {
        heading: "Real People Only",
        body: "We prohibit bots, fake accounts, and impersonation. Users found operating inauthentic accounts are permanently banned with no appeal. Our platform is for real human connection.",
      },
      {
        heading: "Zero Tolerance for Exploitation",
        body: "Any content that sexually exploits minors (CSAM) is immediately removed, reported to the National Center for Missing and Exploited Children (NCMEC), and the account is permanently banned and reported to law enforcement.",
      },
    ],
  },
  {
    icon: <Ban className="w-5 h-5" />,
    title: "Prohibited Content",
    color: "text-red-400",
    items: [
      {
        heading: "Violence & Threats",
        body: "Credible threats of violence against any person or group, content that glorifies real-world violence, or content designed to incite violence is strictly prohibited and will be reported to relevant authorities.",
      },
      {
        heading: "Hate Speech",
        body: "Content that dehumanizes people based on race, ethnicity, national origin, religion, gender, sexual orientation, disability, or disease is not allowed on CLAW.",
      },
      {
        heading: "Harassment & Bullying",
        body: "Sustained targeting of individuals with the intent to harm, intimidate, or humiliate is prohibited. This includes doxxing (sharing private personal information without consent).",
      },
      {
        heading: "Child Safety",
        body: "Any sexual content involving minors, grooming behavior, or content that could be used to exploit children is an absolute zero-tolerance violation. We report all such content to NCMEC and law enforcement immediately.",
      },
      {
        heading: "Non-Consensual Intimate Imagery",
        body: "Sharing intimate images of any person without their explicit consent is prohibited. This includes deepfakes and AI-generated imagery depicting real individuals in sexual situations without consent.",
      },
      {
        heading: "Spam & Scams",
        body: "Coordinated inauthentic behavior, financial scams, phishing attempts, and mass-unsolicited messaging are prohibited.",
      },
    ],
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: "Mental Health & Self-Harm",
    color: "text-pink-400",
    items: [
      {
        heading: "Safe Messaging Guidelines",
        body: "CLAW follows safe messaging guidelines for discussions of suicide and self-harm. We do not allow content that provides methods, instructions, or encourages self-harm. We do allow open, supportive discussions about mental health struggles.",
      },
      {
        heading: "Crisis Resources",
        body: "If you or someone you know is in crisis, please contact the 988 Suicide & Crisis Lifeline by calling or texting 988 (US), or visit 988lifeline.org. International resources: findahelpline.com.",
      },
      {
        heading: "Eating Disorders",
        body: "Content that promotes, glorifies, or provides instructions for disordered eating behaviors is prohibited. Supportive conversations about recovery are welcome.",
      },
    ],
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Adult Content",
    color: "text-amber-400",
    items: [
      {
        heading: "Age Requirement",
        body: "CLAW is intended for users 17 years of age and older. We do not knowingly collect data from users under 17. If we discover an underage user, the account is immediately suspended.",
      },
      {
        heading: "Mature Content",
        body: "Some areas of CLAW may contain mature themes including dark humor, frank discussions of adult topics, and emotionally intense content. These areas are clearly labeled and require acknowledgment.",
      },
      {
        heading: "Explicit Sexual Content",
        body: "Explicit sexual content is only permitted in designated consent-gated areas where all participating users have explicitly opted in. Non-consensual sharing of sexual content to unconfirmed audiences is prohibited.",
      },
    ],
  },
  {
    icon: <Lock className="w-5 h-5" />,
    title: "Privacy & Data Safety",
    color: "text-blue-400",
    items: [
      {
        heading: "Doxxing Prohibition",
        body: "Sharing another user's real name, address, workplace, phone number, or other personally identifying information without their consent is a serious violation resulting in immediate account termination.",
      },
      {
        heading: "Screenshot Policy",
        body: "Screenshots of private conversations or content posted in closed circles taken without consent and shared publicly violate our community standards. We strongly encourage users to respect what happens in private spaces.",
      },
      {
        heading: "Location Privacy",
        body: "We never share precise location data publicly. Location features (when used) are broad and approximate. Users may disable location features at any time in their settings.",
      },
    ],
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: "Misinformation",
    color: "text-orange-400",
    items: [
      {
        heading: "Harmful Misinformation",
        body: "We prohibit content that contains false information that could directly cause real-world harm — such as dangerous medical misinformation, false emergency alerts, or fabricated crisis events.",
      },
      {
        heading: "Satire & Opinion",
        body: "Satire, parody, and personal opinion are protected on CLAW. We are not an arbiter of factual disputes on contested topics. Context and clarity matter.",
      },
    ],
  },
  {
    icon: <Swords className="w-5 h-5" />,
    title: "Enforcement",
    color: "text-purple-400",
    items: [
      {
        heading: "How We Enforce",
        body: "Reports are reviewed by our moderation team within 24–72 hours. Severe violations (CSAM, credible threats, doxxing) are actioned immediately. Lesser violations may result in content removal, temporary suspension, or a warning.",
      },
      {
        heading: "Appeals",
        body: "If you believe your content was removed or your account was actioned in error, you may appeal by contacting us at mandiemariemaddox92@gmail.com with the subject line \"Safety Appeal\" within 30 days of the action.",
      },
      {
        heading: "Repeat Violations",
        body: "Users with repeated violations face escalating consequences up to and including permanent account termination with no further appeal.",
      },
    ],
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "User Tools & Controls",
    color: "text-teal-400",
    items: [
      {
        heading: "Block & Mute",
        body: "Every user can block or mute any other user at any time. Blocked users cannot view your profile, send you messages, or interact with your content.",
      },
      {
        heading: "Circle Privacy Controls",
        body: "Circle administrators control who can join, post, and comment. Circles can be public, invite-only, or secret. Members may leave any circle at any time.",
      },
      {
        heading: "Report Functionality",
        body: "Every post, comment, profile, and message has a Report option. Reports go directly to our moderation queue. You can also report directly at mystichiddengem.com/report.",
      },
      {
        heading: "Account Deletion",
        body: "You may delete your account at any time from your account settings. Deletion removes your profile, posts, and personal data within 30 days, subject to legal hold requirements.",
      },
    ],
  },
];

export default function Safety() {
  useSEO({
    title: "Safety Standards",
    description: `Community safety standards, prohibited content policies, and enforcement guidelines for ${PLATFORM_NAME}.`,
    canonical: "/safety",
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
          <h1 className="font-bold text-sm">Community Safety Standards</h1>
          <p className="text-xs text-muted-foreground">{PLATFORM_NAME}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold">Safety Standards</h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">
            CLAW is a consent-based social platform. These standards define what is allowed, 
            what is not, and how we protect every person who trusts us with their truth.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
            <span>Effective: {EFFECTIVE_DATE}</span>
            <span>·</span>
            <span>{DOMAIN}</span>
            <span>·</span>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>
          </div>
        </div>

        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4" />
            Crisis Resources
          </div>
          <p className="text-muted-foreground">
            If you or someone you know is in immediate danger, call <strong className="text-foreground">911</strong>. 
            For mental health crises, call or text <strong className="text-foreground">988</strong> (US Suicide & Crisis Lifeline). 
            International: <a href="https://findahelpline.com" className="text-violet-400 hover:underline" target="_blank" rel="noreferrer">findahelpline.com</a>
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className={`flex items-center gap-2 font-bold text-lg ${section.color}`}>
              {section.icon}
              {section.title}
            </div>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div key={item.heading} className="bg-card border border-border rounded-xl p-4 space-y-1">
                  <div className="font-semibold text-sm">{item.heading}</div>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-violet-400">
            <Flag className="w-5 h-5" />
            Report a Safety Issue
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            See something that violates these standards? Use the in-app Report button on any post, comment, 
            or profile. For urgent safety issues or law enforcement inquiries, contact us directly at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-violet-400 hover:underline">{CONTACT_EMAIL}</a>.
          </p>
          <Link href="/report">
            <button className="w-full mt-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors">
              Go to Report Center →
            </button>
          </Link>
        </div>

        <div className="flex flex-wrap gap-3 justify-center text-xs text-muted-foreground pt-4 border-t border-border">
          <Link href="/privacy"><span className="hover:text-foreground transition-colors cursor-pointer">Privacy Policy</span></Link>
          <span>·</span>
          <Link href="/terms"><span className="hover:text-foreground transition-colors cursor-pointer">Terms of Service</span></Link>
          <span>·</span>
          <Link href="/data-safety"><span className="hover:text-foreground transition-colors cursor-pointer">Data Safety</span></Link>
          <span>·</span>
          <Link href="/report"><span className="hover:text-foreground transition-colors cursor-pointer">Report Abuse</span></Link>
          <span>·</span>
          <Link href="/guide"><span className="hover:text-foreground transition-colors cursor-pointer">Community Guide</span></Link>
        </div>
      </div>
    </div>
  );
}
