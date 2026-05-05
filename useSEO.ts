import { useEffect } from "react";

const SITE_NAME = "CLAW";
const DEFAULT_OG_IMAGE = "/og-image.png";

export interface SEOConfig {
  title: string;
  description: string;
  ogType?: "website" | "profile" | "article";
  ogImage?: string;
  ogImageAlt?: string;
  canonical?: string;
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: object;
  jsonLdId?: string;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value));
}

function upsertLink(selector: string, attrs: Record<string, string>) {
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([key, value]) => el!.setAttribute(key, value));
}

export function useSEO({
  title,
  description,
  ogType = "website",
  ogImage,
  ogImageAlt,
  canonical,
  noIndex = false,
  keywords,
  jsonLd,
  jsonLdId,
}: SEOConfig) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const imageUrl = ogImage
      ? (ogImage.startsWith("/") ? `${window.location.origin}${ogImage}` : ogImage)
      : `${window.location.origin}${DEFAULT_OG_IMAGE}`;
    const canonicalUrl = canonical
      ? (canonical.startsWith("/") ? `${window.location.origin}${canonical}` : canonical)
      : window.location.href.split("?")[0];

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noIndex
        ? "noindex,nofollow"
        : "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    });

    upsertMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: ogType });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });
    upsertMeta('meta[property="og:image"]', { property: "og:image", content: imageUrl });
    upsertMeta('meta[property="og:image:width"]', { property: "og:image:width", content: "1200" });
    upsertMeta('meta[property="og:image:height"]', { property: "og:image:height", content: "630" });
    upsertMeta('meta[property="og:image:alt"]', { property: "og:image:alt", content: ogImageAlt || `${fullTitle} — CLAW Mystic Social Platform` });
    upsertMeta('meta[property="og:site_name"]', { property: "og:site_name", content: SITE_NAME });

    if (keywords) {
      upsertMeta('meta[name="keywords"]', { name: "keywords", content: keywords });
    }

    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: imageUrl });
    upsertMeta('meta[name="twitter:image:alt"]', { name: "twitter:image:alt", content: ogImageAlt || fullTitle });

    upsertLink('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });

    if (jsonLd && jsonLdId) {
      let el = document.getElementById(jsonLdId);
      if (!el) {
        el = document.createElement("script");
        el.id = jsonLdId;
        el.setAttribute("type", "application/ld+json");
        document.head.appendChild(el);
      }
      el.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      if (jsonLdId) {
        document.getElementById(jsonLdId)?.remove();
      }
    };
  }, [title, description, ogType, ogImage, canonical, noIndex, jsonLd, jsonLdId]);
}
