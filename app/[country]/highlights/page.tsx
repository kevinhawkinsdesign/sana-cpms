import { Suspense } from 'react';
import { Metadata } from 'next';
import { HighlightsHero } from '@/components/highlights/HighlightsHero';
import { FeaturedHighlightsSection } from './FeaturedHighlightsSection';
import { HighlightsGridSection } from './HighlightsGridSection';
import { FeaturedHighlightsSkeleton, HighlightsLoadingSkeleton } from '@/components/highlights/HighlightsLoadingSkeleton';
import { getHighlightsPageSettings } from '@/lib/api/highlights';

export const metadata: Metadata = {
    title: 'Press & Stories | Kabisa',
    description: 'Discover customer success stories, press coverage, interviews, and milestones that showcase Kabisa\'s journey in transforming electric mobility across Africa.',
    openGraph: {
        title: 'Press & Stories | Kabisa',
        description: 'Discover customer success stories, press coverage, interviews, and milestones that showcase Kabisa\'s journey in transforming electric mobility across Africa.',
        type: 'website',
    },
};

export default async function HighlightsPage() {
    // Fetch page settings from Strapi
    const settings = await getHighlightsPageSettings();

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <HighlightsHero settings={settings} />

            {/* Featured Highlights */}
            <Suspense fallback={<FeaturedHighlightsSkeleton />}>
                <FeaturedHighlightsSection settings={settings} />
            </Suspense>

            {/* All Highlights Grid */}
            <section className="py-16 md:py-24 bg-white">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                            {settings.allStoriesSectionTitle}
                        </h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            {settings.allStoriesSectionSubtitle}
                        </p>
                    </div>
                    <Suspense fallback={<HighlightsLoadingSkeleton />}>
                        <HighlightsGridSection />
                    </Suspense>
                </div>
            </section>
        </div>
    );
}
