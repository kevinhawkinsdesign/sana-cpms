'use client';

import React from 'react';

export function HighlightsLoadingSkeleton() {
    return (
        <div className="space-y-8">
            {/* Filter skeleton */}
            <div className="flex justify-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-10 w-24 bg-gray-100 rounded-full animate-pulse"
                    />
                ))}
            </div>

            {/* Grid skeleton */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden bg-white border border-gray-100">
                        <div className="aspect-[16/10] bg-gray-100 animate-pulse" />
                        <div className="p-5 space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-20 bg-gray-100 rounded animate-pulse" />
                                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                            </div>
                            <div className="h-6 w-full bg-gray-100 rounded animate-pulse" />
                            <div className="h-6 w-3/4 bg-gray-100 rounded animate-pulse" />
                            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />
                            <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FeaturedHighlightsSkeleton() {
    return (
        <div className="py-16 md:py-24 bg-gray-50">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                {/* Header skeleton */}
                <div className="text-center mb-12 space-y-4">
                    <div className="h-10 w-64 bg-gray-200 rounded mx-auto animate-pulse" />
                    <div className="h-6 w-96 bg-gray-200 rounded mx-auto animate-pulse" />
                </div>

                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Primary card skeleton */}
                    <div className="min-h-[500px] bg-gray-200 rounded-3xl animate-pulse" />

                    {/* Secondary cards skeleton */}
                    <div className="grid gap-6">
                        <div className="min-h-[220px] bg-gray-200 rounded-3xl animate-pulse" />
                        <div className="min-h-[220px] bg-gray-200 rounded-3xl animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
