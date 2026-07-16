'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { getFeaturedHighlights } from '@/lib/api/highlights';
import { FeaturedHighlights } from '@/components/highlights/FeaturedHighlights';
import { HighlightsPageSettings } from '@/types/highlight';

interface FeaturedHighlightsSectionProps {
    settings: HighlightsPageSettings;
}

export function FeaturedHighlightsSection({ settings }: FeaturedHighlightsSectionProps) {
    const { data: highlights } = useQuery({
        queryKey: ['highlights', 'featured'],
        queryFn: getFeaturedHighlights,
        staleTime: 5 * 60 * 1000,
    });

    if (!highlights || highlights.length === 0) return null;

    return (
        <section id="featured" className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                        {settings.featuredSectionTitle}
                    </h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        {settings.featuredSectionSubtitle}
                    </p>
                </motion.div>

                <FeaturedHighlights highlights={highlights} />
            </div>
        </section>
    );
}
