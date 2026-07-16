'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTestimonials } from '@/lib/api/testimonials';
import { TestimonialItem } from './TestimonialItem';
import { AlertCircle, RefreshCcw, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export function TestimonialsGrid() {
    const {
        data: testimonials,
        isLoading,
        isError,
        refetch
    } = useQuery({
        queryKey: ['testimonials'],
        queryFn: getTestimonials,
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading) {
        return <TestimonialsLoadingSkeleton />;
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

    if (!testimonials || testimonials.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-32"
            >
                <div className="w-20 h-20 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-6">
                    <span className="text-3xl">✨</span>
                </div>
                <p className="text-xl text-gray-900 font-medium">No stories yet</p>
                <p className="text-gray-500 mt-2">Check back soon!</p>
            </motion.div>
        );
    }

    // Collect testimonials with videos
    const testimonialsWithVideos = testimonials.filter(t => t.videoUrl);

    // Extract YouTube video ID
    const getYouTubeId = (url: string) => {
        const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        return match ? match[1] : null;
    };

    return (
        <div className="space-y-32 md:space-y-40">
            {/* Testimonials */}
            {testimonials.map((testimonial, index) => (
                <TestimonialItem
                    key={testimonial.id || testimonial.documentId || testimonial.customerName || index}
                    testimonial={testimonial}
                    index={index}
                />
            ))}

            {/* Video Stories Section */}
            {testimonialsWithVideos.length > 0 && (
                <motion.section
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="pt-16 border-t border-gray-100"
                >
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
                            <Play className="w-4 h-4" />
                            Video Stories
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                            Hear it from them
                        </h2>
                        <p className="mt-3 text-gray-500 max-w-lg mx-auto">
                            Watch our customers share their experiences in their own words.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {testimonialsWithVideos.map((testimonial) => {
                            const videoUrl = testimonial.videoUrl;
                            if (!videoUrl) return null;
                            const youtubeId = getYouTubeId(videoUrl);
                            if (!youtubeId) return null;

                            return (
                                <motion.div
                                    key={`video-${testimonial.id || testimonial.documentId || testimonial.customerName}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    className="group"
                                >
                                    <div className="relative rounded-2xl overflow-hidden bg-gray-900 aspect-video">
                                        <iframe
                                            src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                                            title={`${testimonial.customerName}'s video testimonial`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                            className="absolute inset-0 w-full h-full"
                                        />
                                    </div>
                                    <div className="mt-4 flex items-center gap-3">
                                        {testimonial.customerAvatar?.url && (
                                            <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                                <img
                                                    src={testimonial.customerAvatar.url}
                                                    alt={testimonial.customerName}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <p className="font-semibold text-gray-900">{testimonial.customerName}</p>
                                            <p className="text-sm text-gray-500">
                                                {testimonial.location || testimonial.service || testimonial.vehicleModel}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.section>
            )}
        </div>
    );
}

function TestimonialsLoadingSkeleton() {
    return (
        <div className="space-y-32">
            {/* Side by side skeleton */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
                <div className="space-y-6">
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-5 h-5 bg-gray-100 rounded-full animate-pulse" />
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="h-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-4/5 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-3/5 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Opposite side skeleton */}
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                    <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="w-5 h-5 bg-gray-100 rounded-full animate-pulse" />
                        ))}
                    </div>
                    <div className="space-y-3">
                        <div className="h-8 bg-gray-100 rounded animate-pulse" />
                        <div className="h-8 w-4/5 bg-gray-100 rounded animate-pulse" />
                    </div>
                    <div className="flex items-center gap-4 pt-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                            <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
                        </div>
                    </div>
                </div>
                <div className="aspect-[4/5] bg-gray-100 rounded-3xl animate-pulse" />
            </div>

            {/* Grid style skeleton */}
            <div className="relative">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 row-span-2 aspect-square bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
                    <div className="aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
                </div>
            </div>
        </div>
    );
}
