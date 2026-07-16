'use client';

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { getHighlights } from '@/lib/api/highlights';
import { HighlightCategory } from '@/types/highlight';
import { HighlightCard } from './HighlightCard';
import { CategoryFilter } from './CategoryFilter';
import { HighlightsLoadingSkeleton } from './HighlightsLoadingSkeleton';
import { Button } from '@/components/ui/button';

export function HighlightsGrid() {
    const [selectedCategory, setSelectedCategory] = useState<HighlightCategory | 'all'>('all');

    const {
        data: highlights,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['highlights'],
        queryFn: () => getHighlights(),
        staleTime: 5 * 60 * 1000,
    });

    const filteredHighlights = useMemo(() => {
        if (!highlights) return [];
        if (selectedCategory === 'all') return highlights;
        return highlights.filter(h => h.category === selectedCategory);
    }, [highlights, selectedCategory]);

    if (isLoading) {
        return <HighlightsLoadingSkeleton />;
    }

    if (isError) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 text-center"
            >
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    Unable to load stories
                </h3>
                <p className="text-gray-500 mb-8 max-w-sm">
                    Something went wrong. Please try again.
                </p>
                <Button onClick={() => refetch()} variant="outline" size="lg" className="gap-2 rounded-full">
                    <RefreshCcw className="h-4 w-4" />
                    Retry
                </Button>
            </motion.div>
        );
    }

    if (!highlights || highlights.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32"
            >
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <span className="text-3xl">📰</span>
                </div>
                <p className="text-xl text-gray-900 font-medium">No stories yet</p>
                <p className="text-gray-500 mt-2">Check back soon for updates!</p>
            </motion.div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Filter */}
            <div className="flex justify-center">
                <CategoryFilter
                    selectedCategory={selectedCategory}
                    onCategoryChange={setSelectedCategory}
                />
            </div>

            {/* Grid */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={selectedCategory}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {filteredHighlights.map((highlight, index) => (
                        <HighlightCard
                            key={highlight.id || highlight.slug}
                            highlight={highlight}
                            index={index}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Empty state for filtered results */}
            {filteredHighlights.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                >
                    <p className="text-gray-500">
                        No stories found in this category. Try selecting a different filter.
                    </p>
                </motion.div>
            )}
        </div>
    );
}
