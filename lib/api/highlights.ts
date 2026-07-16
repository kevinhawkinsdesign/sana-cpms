import { BlocksContent } from '@strapi/blocks-react-renderer';
import { Highlight, HighlightCategory, HighlightsPageSettings } from '@/types/highlight';
import { parseStrapiImage, parseStrapiImages, getStrapiAttributes, getStrapiId, getStrapiDocumentId } from './strapi-utils';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.k8s.gokabisa.com';

function parseHighlight(item: unknown): Highlight {
    const attrs = getStrapiAttributes(item);

    return {
        id: getStrapiId(item),
        documentId: getStrapiDocumentId(item),
        title: (attrs['title'] as string) || '',
        slug: (attrs['slug'] as string) || '',
        category: (attrs['category'] as HighlightCategory) || 'press',
        excerpt: attrs['excerpt'] as string | undefined,
        content: attrs['content'] as BlocksContent | undefined,
        featuredImage: parseStrapiImage(attrs['featuredImage']) ?? undefined,
        gallery: parseStrapiImages(attrs['gallery']),
        videoUrl: attrs['videoUrl'] as string | undefined,
        externalUrl: attrs['externalUrl'] as string | undefined,
        source: attrs['source'] as string | undefined,
        author: attrs['author'] as string | undefined,
        customerName: attrs['customerName'] as string | undefined,
        customerTitle: attrs['customerTitle'] as string | undefined,
        customerCompany: attrs['customerCompany'] as string | undefined,
        customerAvatar: parseStrapiImage(attrs['customerAvatar']) ?? undefined,
        eventDate: attrs['eventDate'] as string | undefined,
        eventLocation: attrs['eventLocation'] as string | undefined,
        isFeatured: attrs['isFeatured'] as boolean | undefined,
        featuredOrder: attrs['featuredOrder'] as number | undefined,
        publishedDate: (attrs['publishedDate'] as string) || new Date().toISOString(),
        tags: attrs['tags'] as string[] | undefined,
        createdAt: (attrs['createdAt'] as string) || new Date().toISOString(),
        publishedAt: attrs['publishedAt'] as string | undefined
    };
}

export const getHighlights = async (category?: HighlightCategory): Promise<Highlight[]> => {
    try {
        let url = `${STRAPI_URL}/api/highlights?populate=*&sort[0]=publishedDate:desc`;

        if (category) {
            url += `&filters[category][$eq]=${category}`;
        }

        const response = await fetch(url, { next: { revalidate: 60 } });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const data = (json && json.data) || [];

        if (!Array.isArray(data)) return [];

        return data.map(parseHighlight);
    } catch (error) {
        console.error('Error fetching highlights:', error);
        throw error;
    }
};

export const getFeaturedHighlights = async (): Promise<Highlight[]> => {
    try {
        const response = await fetch(
            `${STRAPI_URL}/api/highlights?populate=*&filters[isFeatured][$eq]=true&sort[0]=featuredOrder:asc&pagination[limit]=3`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const json = await response.json();
        const data = (json && json.data) || [];

        if (!Array.isArray(data)) return [];

        return data.map(parseHighlight);
    } catch (error) {
        console.error('Error fetching featured highlights:', error);
        throw error;
    }
};

export const getHighlightBySlug = async (slug: string): Promise<Highlight | null> => {
    try {
        const response = await fetch(
            `${STRAPI_URL}/api/highlights?populate=*&filters[slug][$eq]=${encodeURIComponent(slug)}`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) {
            console.error(`Error fetching highlight: HTTP ${response.status}`);
            return null;
        }

        const json = await response.json();
        const data = (json && json.data) || [];

        if (!Array.isArray(data) || data.length === 0) return null;

        return parseHighlight(data[0]);
    } catch (error) {
        console.error('Error fetching highlight by slug:', error);
        return null;
    }
};

// Default settings fallback
const defaultPageSettings: HighlightsPageSettings = {
    heroTitle: 'Stories that drive our mission forward',
    heroSubtitle: 'From customer success stories to press coverage and major milestones, discover how Kabisa is transforming electric mobility across Africa.',
    heroVideoUrl: undefined,
    heroBackgroundImage: undefined,
    primaryButtonText: 'View Featured Stories',
    primaryButtonLink: '#featured',
    secondaryButtonText: 'Contact Press Team',
    secondaryButtonLink: '/contact',
    showPrimaryButton: true,
    showSecondaryButton: true,
    featuredSectionTitle: 'Featured Stories',
    featuredSectionSubtitle: 'Discover the highlights that showcase our impact and journey.',
    allStoriesSectionTitle: 'All Stories',
    allStoriesSectionSubtitle: 'Browse our complete collection of press coverage, customer stories, and company milestones.',
};

export const getHighlightsPageSettings = async (): Promise<HighlightsPageSettings> => {
    try {
        const response = await fetch(
            `${STRAPI_URL}/api/highlights-page?populate=*`,
            { next: { revalidate: 60 } }
        );

        if (!response.ok) {
            console.warn('Highlights page settings not found, using defaults');
            return defaultPageSettings;
        }

        const json = await response.json();
        const data = json?.data;

        if (!data) {
            return defaultPageSettings;
        }

        const attrs = getStrapiAttributes(data);

        return {
            heroTitle: (attrs.heroTitle as string) || defaultPageSettings.heroTitle,
            heroSubtitle: (attrs.heroSubtitle as string) || defaultPageSettings.heroSubtitle,
            heroVideoUrl: (attrs.heroVideoUrl as string) || undefined,
            heroBackgroundImage: parseStrapiImage(attrs.heroBackgroundImage) ?? undefined,
            primaryButtonText: (attrs.primaryButtonText as string) || defaultPageSettings.primaryButtonText,
            primaryButtonLink: (attrs.primaryButtonLink as string) || defaultPageSettings.primaryButtonLink,
            secondaryButtonText: (attrs.secondaryButtonText as string) || defaultPageSettings.secondaryButtonText,
            secondaryButtonLink: (attrs.secondaryButtonLink as string) || defaultPageSettings.secondaryButtonLink,
            showPrimaryButton: (attrs.showPrimaryButton as boolean) ?? defaultPageSettings.showPrimaryButton,
            showSecondaryButton: (attrs.showSecondaryButton as boolean) ?? defaultPageSettings.showSecondaryButton,
            featuredSectionTitle: (attrs.featuredSectionTitle as string) || defaultPageSettings.featuredSectionTitle,
            featuredSectionSubtitle: (attrs.featuredSectionSubtitle as string) || defaultPageSettings.featuredSectionSubtitle,
            allStoriesSectionTitle: (attrs.allStoriesSectionTitle as string) || defaultPageSettings.allStoriesSectionTitle,
            allStoriesSectionSubtitle: (attrs.allStoriesSectionSubtitle as string) || defaultPageSettings.allStoriesSectionSubtitle,
        };
    } catch (error) {
        console.error('Error fetching highlights page settings:', error);
        return defaultPageSettings;
    }
};
