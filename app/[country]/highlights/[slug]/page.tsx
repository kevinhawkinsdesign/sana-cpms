import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getHighlightBySlug, getHighlights } from '@/lib/api/highlights';
import { HighlightDetail } from '@/components/highlights/HighlightDetail';

interface HighlightPageProps {
    params: Promise<{
        country: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: HighlightPageProps): Promise<Metadata> {
    try {
        const { slug } = await params;
        const highlight = await getHighlightBySlug(slug);

        if (!highlight) {
            return {
                title: 'Story Not Found | Kabisa',
            };
        }

        return {
            title: `${highlight.title} | Kabisa`,
            description: highlight.excerpt || `Read about ${highlight.title} on Kabisa.`,
            openGraph: {
                title: highlight.title,
                description: highlight.excerpt || `Read about ${highlight.title} on Kabisa.`,
                type: 'article',
                publishedTime: highlight.publishedDate,
                images: highlight.featuredImage?.url ? [highlight.featuredImage.url] : [],
            },
            twitter: {
                card: 'summary_large_image',
                title: highlight.title,
                description: highlight.excerpt || `Read about ${highlight.title} on Kabisa.`,
                images: highlight.featuredImage?.url ? [highlight.featuredImage.url] : [],
            },
        };
    } catch {
        return {
            title: 'Story | Kabisa',
        };
    }
}

// Force dynamic rendering to avoid SSG issues with Strapi data
export const dynamic = 'force-dynamic';

export async function generateStaticParams() {
    try {
        const highlights = await getHighlights();
        const countries = ['rw', 'ke'];

        return highlights
            .filter(h => !h.externalUrl)
            .flatMap((highlight) =>
                countries.map(country => ({
                    country,
                    slug: highlight.slug,
                }))
            );
    } catch {
        return [];
    }
}

export default async function HighlightPage({ params }: HighlightPageProps) {
    const { slug } = await params;

    let highlight;
    try {
        highlight = await getHighlightBySlug(slug);
    } catch (error) {
        console.error('Error loading highlight:', error);
        notFound();
    }

    if (!highlight) {
        notFound();
    }

    // If this highlight has an external URL, redirect
    if (highlight.externalUrl) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 mb-4">Redirecting to external source...</p>
                    <a
                        href={highlight.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        Click here if not redirected
                    </a>
                </div>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `window.location.href = "${highlight.externalUrl}";`,
                    }}
                />
            </div>
        );
    }

    return <HighlightDetail highlight={highlight} />;
}
