'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { HighlightCategory, HIGHLIGHT_CATEGORY_LABELS } from '@/types/highlight';
import { cn } from '@/lib/utils';

interface CategoryFilterProps {
    selectedCategory: HighlightCategory | 'all';
    onCategoryChange: (category: HighlightCategory | 'all') => void;
}

const categories: Array<{ value: HighlightCategory | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'customer_testimonial', label: HIGHLIGHT_CATEGORY_LABELS.customer_testimonial },
    { value: 'press', label: HIGHLIGHT_CATEGORY_LABELS.press },
    { value: 'interview', label: HIGHLIGHT_CATEGORY_LABELS.interview },
    { value: 'milestone', label: HIGHLIGHT_CATEGORY_LABELS.milestone },
];

export function CategoryFilter({ selectedCategory, onCategoryChange }: CategoryFilterProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
                <button
                    key={category.value}
                    onClick={() => onCategoryChange(category.value)}
                    className={cn(
                        "relative px-4 py-2 text-sm font-medium rounded-full transition-colors duration-200",
                        selectedCategory === category.value
                            ? "text-white"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    )}
                >
                    {selectedCategory === category.value && (
                        <motion.div
                            layoutId="activeCategory"
                            className="absolute inset-0 bg-primary rounded-full"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10">{category.label}</span>
                </button>
            ))}
        </div>
    );
}
