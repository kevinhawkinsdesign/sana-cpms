'use client';

import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
    animated?: boolean;
}

const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
};

export function StarRating({
    rating,
    maxRating = 5,
    size = 'md',
    className,
    animated = false
}: StarRatingProps) {
    const safeRating = Math.max(0, Math.min(rating || 0, maxRating));
    const safeMaxRating = Math.max(1, maxRating);

    return (
        <div className={cn("flex gap-0.5", className)} aria-label={`Rated ${safeRating} out of ${safeMaxRating} stars`}>
            {Array.from({ length: safeMaxRating }).map((_, i) => (
                <Star
                    key={i}
                    className={cn(
                        sizeClasses[size],
                        i < safeRating
                            ? "fill-amber-400 text-amber-400"
                            : "fill-gray-200 text-gray-200 dark:fill-gray-700 dark:text-gray-700",
                        animated && "transition-transform duration-300 group-hover:scale-110"
                    )}
                    style={animated ? { transitionDelay: `${i * 50}ms` } : undefined}
                />
            ))}
        </div>
    );
}
