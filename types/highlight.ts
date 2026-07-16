import { BlocksContent } from '@strapi/blocks-react-renderer';
import { StrapiImage } from '@/lib/api/strapi-utils';

export type HighlightCategory = 'customer_testimonial' | 'press' | 'interview' | 'milestone';

export type HighlightImage = StrapiImage;

export interface Highlight {
    id: string;
    documentId?: string;
    title: string;
    slug: string;
    category: HighlightCategory;
    excerpt?: string;
    content?: BlocksContent;
    featuredImage?: HighlightImage;
    gallery?: HighlightImage[];
    videoUrl?: string;
    externalUrl?: string;
    source?: string;
    author?: string;
    customerName?: string;
    customerTitle?: string;
    customerCompany?: string;
    customerAvatar?: HighlightImage;
    eventDate?: string;
    eventLocation?: string;
    isFeatured?: boolean;
    featuredOrder?: number;
    publishedDate: string;
    tags?: string[];
    createdAt: string;
    publishedAt?: string;
}

export const HIGHLIGHT_CATEGORY_LABELS: Record<HighlightCategory, string> = {
    customer_testimonial: 'Customer Story',
    press: 'Press',
    interview: 'Interview',
    milestone: 'Milestone',
};

export const HIGHLIGHT_CATEGORY_COLORS: Record<HighlightCategory, { bg: string; text: string }> = {
    customer_testimonial: { bg: 'bg-blue-100', text: 'text-blue-700' },
    press: { bg: 'bg-purple-100', text: 'text-purple-700' },
    interview: { bg: 'bg-green-100', text: 'text-green-700' },
    milestone: { bg: 'bg-amber-100', text: 'text-amber-700' },
};

export interface HighlightsPageSettings {
    heroTitle: string;
    heroSubtitle: string;
    heroVideoUrl?: string;
    heroBackgroundImage?: HighlightImage;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    showPrimaryButton: boolean;
    showSecondaryButton: boolean;
    featuredSectionTitle: string;
    featuredSectionSubtitle: string;
    allStoriesSectionTitle: string;
    allStoriesSectionSubtitle: string;
}
