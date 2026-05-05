import { Router } from "express";

const router = Router();

// Digital Asset Links — required for TWA (Trusted Web Activity) on Google Play
// After generating your Android signing keystore with Bubblewrap, replace
// REPLACE_WITH_YOUR_SHA256_FINGERPRINT with the actual SHA-256 from your keystore.
// Run: keytool -list -v -keystore your-keystore.jks -alias android
// The fingerprint looks like: AB:CD:EF:12:... (32 colon-separated hex pairs)
router.get("/.well-known/assetlinks.json", (_req, res) => {
  const fingerprint = process.env.ANDROID_SHA256_FINGERPRINT || "REPLACE_WITH_YOUR_SHA256_FINGERPRINT";
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.mystichiddengem.claw",
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]);
});

// PWA notification badge (Web App Manifest compliance)
router.get("/.well-known/web-app-origin-association", (_req, res) => {
  res.json({
    web_apps: [
      {
        web_app_identity: "https://www.mystichiddengem.com/",
      },
    ],
  });
});

export default router;
