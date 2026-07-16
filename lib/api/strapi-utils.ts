/**
 * Shared utilities for parsing Strapi API responses
 */

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.k8s.gokabisa.com';

export interface StrapiImage {
    url: string;
    alternativeText?: string;
    width?: number;
    height?: number;
}

/**
 * Parse a single image from Strapi response (supports both v4 and v5 formats)
 */
export function parseStrapiImage(imageData: unknown): StrapiImage | null {
    if (!imageData || typeof imageData !== 'object') return null;

    const data = imageData as Record<string, unknown>;

    // Strapi v5: image is directly on the field
    if (data.url && typeof data.url === 'string') {
        let imgUrl = data.url as string;
        if (!imgUrl.startsWith('http')) {
            imgUrl = `${STRAPI_URL}${imgUrl}`;
        }
        return {
            url: imgUrl,
            alternativeText: (data.alternativeText || data.name) as string | undefined,
            width: typeof data.width === 'number' ? data.width : undefined,
            height: typeof data.height === 'number' ? data.height : undefined
        };
    }

    // Strapi v4: image is nested in data.attributes
    if (data.data) {
        const imgData = Array.isArray(data.data) ? data.data[0] : data.data;
        if (imgData && typeof imgData === 'object') {
            const imgRecord = imgData as Record<string, unknown>;
            const imgAttrs = (imgRecord.attributes as Record<string, unknown>) || imgRecord;
            const imgUrl = imgAttrs?.url;
            if (!imgUrl || typeof imgUrl !== 'string') return null;
            const finalUrl = imgUrl.startsWith('http') ? imgUrl : `${STRAPI_URL}${imgUrl}`;
            return {
                url: finalUrl,
                alternativeText: imgAttrs.alternativeText as string | undefined,
                width: typeof imgAttrs.width === 'number' ? imgAttrs.width : undefined,
                height: typeof imgAttrs.height === 'number' ? imgAttrs.height : undefined
            };
        }
    }

    return null;
}

/**
 * Parse multiple images from Strapi response (supports both v4 and v5 formats)
 */
export function parseStrapiImages(imagesData: unknown): StrapiImage[] {
    if (!imagesData) return [];

    // Strapi v5: array of images directly
    if (Array.isArray(imagesData)) {
        return imagesData.map(img => parseStrapiImage(img)).filter(Boolean) as StrapiImage[];
    }

    const data = imagesData as Record<string, unknown>;
    // Strapi v4: nested in data
    if (data.data && Array.isArray(data.data)) {
        return data.data
            .map((imgData: unknown) => parseStrapiImage(imgData))
            .filter((img): img is StrapiImage => img !== null);
    }

    return [];
}

/**
 * Get attributes from Strapi item (supports both v4 and v5 formats)
 */
export function getStrapiAttributes(item: unknown): Record<string, unknown> {
    const it = item as Record<string, unknown>;
    return (it['attributes'] as Record<string, unknown>) || it;
}

/**
 * Get ID from Strapi item
 */
export function getStrapiId(item: unknown): string {
    const it = item as Record<string, unknown>;
    const idVal = it['id'] as string | number | undefined;
    return idVal?.toString() || '';
}

/**
 * Get document ID from Strapi item (v5)
 */
export function getStrapiDocumentId(item: unknown): string | undefined {
    const it = item as Record<string, unknown>;
    return it['documentId'] as string | undefined;
}
