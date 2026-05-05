import { Link } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { Shield, Music, FileText, AlertTriangle, Mail, ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "April 5, 2026";
const CONTACT_EMAIL = "mandiemariemaddox92@gmail.com";
const PLATFORM_NAME = "CLAW – Mystic Kitty Catastrophe";
const DOMAIN = "www.mystichiddengem.com";

export default function Terms() {
  useSEO({
    title: "Terms of Service & Copyright Policy",
    description: `Legal terms, copyright policy, DMCA notice, and music upload rules for ${PLATFORM_NAME}.`,
    canonical: "/terms",
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </Link>
        <span className="text-white/30 text-sm font-medium">CLAW · Terms of Service</span>
      </div>
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-10 text-white/80">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-purple-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" /> Legal
          </div>
          <h1 className="text-3xl font-serif font-bold text-white">Terms of Service</h1>
          <p className="text-white/40 text-sm">Effective: {EFFECTIVE_DATE} · {DOMAIN}</p>
        </div>

        <Section icon={<FileText className="w-4 h-4" />} title="1. Acceptance of Terms">
          <p>By accessing or using {PLATFORM_NAME} ("the Platform", "we", "us", "our"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>
          <p>You must be at least 13 years old to use CLAW. By creating an account, you represent that you meet this age requirement.</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="2. User-Generated Content">
          <p><strong className="text-white">You own your content.</strong> When you post text, images, audio, video, or other material ("User Content"), you retain ownership. However, by posting, you grant CLAW a non-exclusive, worldwide, royalty-free license to display and distribute that content on the Platform solely for operating the service.</p>
          <p><strong className="text-white">You are solely responsible</strong> for all content you upload, post, transmit, or share through CLAW. This includes responsibility for ensuring you have the legal right to share any content — including audio, music, video, and images — before uploading it.</p>
          <p>We do not pre-screen content. We reserve the right to remove any content that violates these Terms or applicable law without prior notice.</p>
        </Section>

        <Section icon={<Music className="w-4 h-4 text-purple-400" />} title="3. Music & Audio Copyright Policy">
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-3 mb-4">
            <p className="text-purple-300 font-medium text-sm">⚠️ Important: Please read this section carefully before uploading any audio.</p>
          </div>

          <p><strong className="text-white">Original content only.</strong> The audio upload feature on CLAW is intended exclusively for:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Music and audio you personally created and own the rights to</li>
            <li>Audio that is in the public domain</li>
            <li>Audio licensed under Creative Commons (with proper attribution)</li>
            <li>Audio for which you hold a valid, explicit license permitting online streaming and sharing</li>
          </ul>

          <p className="mt-3"><strong className="text-white">Prohibited audio includes:</strong></p>
          <ul className="list-disc list-inside space-y-1 pl-2 text-red-300/80">
            <li>Commercially released songs you do not own or have a license for</li>
            <li>Recordings by major or independent artists without explicit written permission</li>
            <li>Audio with recognizable samples from copyrighted recordings</li>
            <li>AI-generated music that incorporates unlicensed copyrighted material</li>
          </ul>

          <p className="mt-3">By uploading audio, <strong className="text-white">you certify under penalty of perjury</strong> that you have all necessary rights to upload, share, and stream that audio on this platform, and that doing so does not infringe any third party's copyright, trademark, or other intellectual property rights.</p>

          <p>Violation of this policy may result in content removal, account suspension, or permanent ban. Repeat infringers will be terminated from the platform.</p>
        </Section>

        <Section icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} title="4. DMCA Copyright Takedown Notice">
          <p>CLAW complies with the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512. If you believe content on CLAW infringes your copyright, you may submit a takedown notice to our designated agent.</p>

          <p className="mt-2"><strong className="text-white">Your DMCA notice must include:</strong></p>
          <ol className="list-decimal list-inside space-y-1 pl-2 text-sm">
            <li>Your physical or electronic signature</li>
            <li>Identification of the copyrighted work claimed to be infringed</li>
            <li>Identification of the allegedly infringing material and its location on our Platform (URL)</li>
            <li>Your contact information (address, phone, email)</li>
            <li>A statement that you have a good faith belief that the use is not authorized</li>
            <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner</li>
          </ol>

          <div className="mt-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
            <Mail className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <div className="text-xs text-white/40 uppercase tracking-widest">Send DMCA notices to</div>
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-purple-400 hover:text-purple-300 text-sm font-medium">{CONTACT_EMAIL}</a>
            </div>
          </div>

          <p className="mt-3 text-sm text-white/50">Counter-notices may be submitted per 17 U.S.C. § 512(g). We reserve the right to forward takedown notices to the uploader.</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="5. Prohibited Conduct">
          <p>You agree not to:</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>Upload, post, or transmit content that infringes any third party's intellectual property rights</li>
            <li>Harass, threaten, or harm other users</li>
            <li>Post sexually explicit content involving minors</li>
            <li>Impersonate other persons or entities</li>
            <li>Distribute spam, malware, or unauthorized commercial content</li>
            <li>Attempt to reverse-engineer or tamper with the Platform's systems</li>
            <li>Use the Platform for any illegal purpose under applicable law</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="6. Payments and GEMZ">
          <p>GEMZ are a virtual currency purchasable via Stripe. Coins have no real-world cash value and cannot be exchanged, refunded, or transferred to other users unless the Platform explicitly supports such features.</p>
          <p>All purchases are final unless required by applicable consumer protection law. Stripe's terms of service also apply to all payment transactions.</p>
          <p>Tip jar transactions are voluntary peer-to-peer coin transfers. CLAW does not guarantee or control the fulfillment of any tipped content or services.</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="7. Privacy">
          <p>Your use of CLAW is also governed by our Privacy Policy. By using the Platform, you consent to the collection and use of your information as described therein. We do not sell your personal data to third parties.</p>
        </Section>

        <Section icon={<Shield className="w-4 h-4" />} title="8. Disclaimers & Limitation of Liability">
          <p>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, CLAW AND ITS OPERATORS DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED.</p>
          <p>WE ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING FROM YOUR USE OF THE PLATFORM, INCLUDING ANY LOSS OF DATA OR PROFITS.</p>
          <p>WE ARE NOT RESPONSIBLE FOR USER-GENERATED CONTENT, INCLUDING INFRINGING AUDIO, IMAGES, OR TEXT POSTED BY USERS. OUR LIABILITY IS LIMITED TO THE MAXIMUM EXTENT PERMITTED UNDER 17 U.S.C. § 512 (DMCA SAFE HARBOR).</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="9. Termination">
          <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms, without prior notice. You may also delete your account at any time by contacting us.</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="10. Governing Law">
          <p>These Terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of competent jurisdiction, and you agree to personal jurisdiction therein.</p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" />} title="11. Changes to These Terms">
          <p>We may update these Terms at any time. Continued use of the Platform after changes are posted constitutes acceptance of the new Terms. We will notify users of material changes via the Platform.</p>
        </Section>

        <Section icon={<Mail className="w-4 h-4" />} title="12. Contact">
          <p>For legal inquiries, copyright notices, or general questions:</p>
          <div className="mt-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
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
