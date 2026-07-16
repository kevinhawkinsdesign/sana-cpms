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

// The static export build has no reachable Strapi CMS to enumerate real
// slugs from (and no server to render one on demand afterward), so no real
// highlight gets pre-rendered — this content is marketing copy unrelated to
// the CPMS demo itself. A dynamic segment can't resolve to zero static
// instances under output:'export', so this is a single placeholder slug
// that 404s via the page's own not-found handling below.
export async function generateStaticParams() {
    return [{ slug: '_none' }];
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
