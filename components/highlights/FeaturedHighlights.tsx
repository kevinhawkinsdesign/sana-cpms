'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight, Play, ExternalLink } from 'lucide-react';
import { Highlight, HIGHLIGHT_CATEGORY_LABELS, HIGHLIGHT_CATEGORY_COLORS } from '@/types/highlight';
import { HighlightLink } from './HighlightLink';
import { cn } from '@/lib/utils';

interface FeaturedHighlightsProps {
    highlights: Highlight[];
}

export function FeaturedHighlights({ highlights }: FeaturedHighlightsProps) {
    if (!highlights || highlights.length === 0) return null;

    const [primary, ...secondary] = highlights;

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Primary featured item - larger card */}
            {primary && (
                <FeaturedCard highlight={primary} isPrimary />
            )}

            {/* Secondary featured items - stacked */}
            <div className="grid gap-6">
                {secondary.map((highlight, index) => (
                    <FeaturedCard key={highlight.id || highlight.slug} highlight={highlight} index={index} />
                ))}
            </div>
        </div>
    );
}

interface FeaturedCardProps {
    highlight: Highlight;
    isPrimary?: boolean;
    index?: number;
}

function FeaturedCard({ highlight, isPrimary = false, index = 0 }: FeaturedCardProps) {
    const {
        title,
        slug,
        category,
        excerpt,
        featuredImage,
        videoUrl,
        externalUrl,
        source,
        customerName,
        customerCompany
    } = highlight;

    const categoryLabel = HIGHLIGHT_CATEGORY_LABELS[category] || 'Story';
    const categoryColors = HIGHLIGHT_CATEGORY_COLORS[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    const isExternal = !!externalUrl;

    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="group h-full"
        >
            <HighlightLink slug={slug} externalUrl={externalUrl}>
                <div className={cn(
                    "relative h-full rounded-3xl overflow-hidden",
                    "bg-white shadow-lg hover:shadow-2xl",
                    "transition-all duration-500",
                    isPrimary ? "min-h-[500px]" : "min-h-[220px]"
                )}>
                    {/* Image */}
                    <div className={cn(
                        "absolute inset-0",
                        isPrimary ? "" : "lg:w-2/5"
                    )}>
                        {featuredImage?.url ? (
                            <Image
                                src={featuredImage.url}
                                alt={featuredImage.alternativeText || title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes={isPrimary ? "(max-width: 1024px) 100vw, 50vw" : "(max-width: 1024px) 100vw, 25vw"}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
                        )}
                        <div className={cn(
                            "absolute inset-0",
                            isPrimary
                                ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                                : "lg:bg-gradient-to-r lg:from-transparent lg:to-white"
                        )} />
                    </div>

                    {/* Video indicator */}
                    {videoUrl && isPrimary && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-300">
                                <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <div className={cn(
                        "relative z-10 h-full flex flex-col justify-end p-6 md:p-8",
                        !isPrimary && "lg:ml-[40%]"
                    )}>
                        {/* Category badge */}
                        <span className={cn(
                            "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold w-fit mb-4",
                            isPrimary
                                ? "bg-white/20 text-white backdrop-blur-sm"
                                : cn(categoryColors.bg, categoryColors.text)
                        )}>
                            {categoryLabel}
                        </span>

                        {/* Title */}
                        <h3 className={cn(
                            "font-bold mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300",
                            isPrimary
                                ? "text-2xl md:text-3xl text-white"
                                : "text-lg md:text-xl text-gray-900"
                        )}>
                            {title}
                        </h3>

                        {/* Excerpt */}
                        {excerpt && isPrimary && (
                            <p className="text-gray-300 line-clamp-2 mb-4 max-w-lg">
                                {excerpt}
                            </p>
                        )}

                        {/* Meta */}
                        <div className={cn(
                            "flex items-center gap-3 text-sm",
                            isPrimary ? "text-gray-400" : "text-gray-500"
                        )}>
                            {source && <span className="font-medium">{source}</span>}
                            {customerName && (
                                <span>
                                    {customerName}
                                    {customerCompany && `, ${customerCompany}`}
                                </span>
                            )}
                            {isExternal ? (
                                <ExternalLink className="w-4 h-4 ml-auto" />
                            ) : (
                                <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform duration-300" />
                            )}
                        </div>
                    </div>
                </div>
            </HighlightLink>
        </motion.article>
    );
}
