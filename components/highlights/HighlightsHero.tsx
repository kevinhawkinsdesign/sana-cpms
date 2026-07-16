'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { HighlightsPageSettings } from '@/types/highlight';

interface HighlightsHeroProps {
    settings: HighlightsPageSettings;
}

// Extract YouTube video ID
function getYouTubeId(url: string): string | null {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
    return match ? match[1] : null;
}

// Check if URL is a direct video file
function isDirectVideoUrl(url: string): boolean {
    return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
}

export function HighlightsHero({ settings }: HighlightsHeroProps) {
    const {
        heroTitle,
        heroSubtitle,
        heroVideoUrl,
        heroBackgroundImage,
        primaryButtonText,
        primaryButtonLink,
        secondaryButtonText,
        secondaryButtonLink,
        showPrimaryButton,
        showSecondaryButton,
    } = settings;

    // Split title by newline for styling
    const titleParts = heroTitle.split('\n');
    const mainTitle = titleParts[0];
    const subTitle = titleParts.slice(1).join(' ');

    const youtubeId = heroVideoUrl ? getYouTubeId(heroVideoUrl) : null;
    const isDirectVideo = heroVideoUrl ? isDirectVideoUrl(heroVideoUrl) : false;

    return (
        <section className="relative min-h-[70vh] flex items-center overflow-hidden pt-20">
            {/* YouTube Background */}
            {youtubeId && (
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 scale-150">
                        <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                            title="Background video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] pointer-events-none"
                            style={{ border: 'none' }}
                        />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/20" />
                </div>
            )}

            {/* Direct Video Background (MP4/WebM) */}
            {isDirectVideo && heroVideoUrl && (
                <div className="absolute inset-0 z-0">
                    <video
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                    >
                        <source src={heroVideoUrl} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/20" />
                </div>
            )}

            {/* Background Image (if no video) */}
            {!youtubeId && !isDirectVideo && heroBackgroundImage?.url && (
                <div className="absolute inset-0 z-0">
                    <Image
                        src={heroBackgroundImage.url}
                        alt="Hero background"
                        fill
                        className="object-cover"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/20" />
                </div>
            )}

            {/* Fallback gradient background */}
            {!youtubeId && !isDirectVideo && !heroBackgroundImage?.url && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 z-0" />
            )}

            <div className="container mx-auto px-4 md:px-6 lg:px-8 relative z-10">
                <div className="max-w-4xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white text-sm font-medium px-4 py-2 rounded-full mb-6">
                            <Play className="w-4 h-4" />
                            Press & Stories
                        </span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6"
                    >
                        {mainTitle}
                        {subTitle && (
                            <>
                                <br />
                                <span className="text-primary">{subTitle}</span>
                            </>
                        )}
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-gray-300 max-w-2xl mb-8"
                    >
                        {heroSubtitle}
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex flex-wrap gap-4"
                    >
                        {showPrimaryButton && (
                            <Button
                                asChild
                                size="lg"
                                className="rounded-full px-8"
                            >
                                <LocalizedLink href={primaryButtonLink}>
                                    {primaryButtonText}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </LocalizedLink>
                            </Button>
                        )}
                        {showSecondaryButton && (
                            <Button
                                asChild
                                variant="outline"
                                size="lg"
                                className="rounded-full px-8 bg-white/10 border-white/20 text-white hover:bg-white/20"
                            >
                                <LocalizedLink href={secondaryButtonLink}>
                                    {secondaryButtonText}
                                </LocalizedLink>
                            </Button>
                        )}
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
