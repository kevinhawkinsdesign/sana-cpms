// Utilities for building image delivery URLs.
// Handles both legacy Cloudflare Images URLs (imagedelivery.net) and new R2 URLs (assets.gokabisa.com).

export type ImageVariant = 'public' | 'avatar' | 'thumb' | 'hero';

// Variant dimensions for Cloudflare Image Transformations on R2
const VARIANT_DIMENSIONS: Record<ImageVariant, { w: number; h: number } | null> = {
  public: null,        // Full size — no transform
  hero:   { w: 1280, h: 720 },
  avatar: { w: 150, h: 150 },
  thumb:  { w: 300, h: 300 },
};

// ── Legacy Cloudflare Images helpers (kept for transition period) ──

export function buildCloudflareImageUrl(imageId: string, variant: ImageVariant = 'public'): string {
  const accountHash = process.env.NEXT_PUBLIC_CF_IMAGES_ACCOUNT_HASH;
  if (!accountHash) {
    return `https://imagedelivery.net/_MISSING_ACCOUNT_HASH_/${imageId}/${variant}`;
  }
  return `https://imagedelivery.net/${accountHash}/${imageId}/${variant}`;
}

export function replaceVariant(urlOrId: string, variant: ImageVariant): string {
  if (urlOrId.startsWith('http')) {
    try {
      const url = new URL(urlOrId);
      const parts = url.pathname.split('/').filter(Boolean);

      if (parts.length >= 3) {
        parts[2] = variant;
        url.pathname = `/${parts.join('/')}`;
        return url.toString();
      }
    } catch {
      // Fall through
    }
  }
  return buildCloudflareImageUrl(urlOrId, variant);
}

// ── Unified URL resolver (handles both CF Images and R2) ──

export function getImageUrl(urlOrId: string, variant?: ImageVariant): string {
  if (!urlOrId) return '';

  // Old Cloudflare Images URL — use path-based variants
  if (urlOrId.includes('imagedelivery.net')) {
    return variant ? replaceVariant(urlOrId, variant) : urlOrId;
  }

  // R2 URL — use Cloudflare Image Transformations for resizing if variant requested
  if (urlOrId.startsWith('http')) {
    if (!variant || variant === 'public') return urlOrId;

    const dims = VARIANT_DIMENSIONS[variant];
    if (!dims) return urlOrId;

    // Next.js Image component handles resizing client-side via its built-in optimization.
    // For contexts outside Next.js <Image> (emails, Airtable, direct <img>),
    // Cloudflare Image Transformations can be used:
    //   https://assets.gokabisa.com/cdn-cgi/image/width=150,height=150,fit=cover/images/...
    // But for the web app, we return the raw URL and let Next.js handle sizing via width/height props.
    return urlOrId;
  }

  // Bare image ID (legacy) — assume Cloudflare Images
  return buildCloudflareImageUrl(urlOrId, variant || 'public');
}
