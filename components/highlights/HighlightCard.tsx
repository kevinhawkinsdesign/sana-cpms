'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ExternalLink, Play, Calendar, MapPin } from 'lucide-react';
import { Highlight, HIGHLIGHT_CATEGORY_LABELS, HIGHLIGHT_CATEGORY_COLORS } from '@/types/highlight';
import { HighlightLink } from './HighlightLink';
import { cn } from '@/lib/utils';

interface HighlightCardProps {
    highlight: Highlight;
    className?: string;
    index?: number;
}

export function HighlightCard({ highlight, className, index = 0 }: HighlightCardProps) {
    const {
        title,
        slug,
        category,
        excerpt,
        featuredImage,
        videoUrl,
        externalUrl,
        source,
        publishedDate,
        customerName,
        customerCompany,
        eventLocation
    } = highlight;

    const categoryLabel = HIGHLIGHT_CATEGORY_LABELS[category] || 'Story';
    const categoryColors = HIGHLIGHT_CATEGORY_COLORS[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    const isExternal = !!externalUrl;

    const formattedDate = publishedDate
        ? new Date(publishedDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Recent';

    return (
        <motion.article
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={cn("group h-full", className)}
        >
            <HighlightLink slug={slug} externalUrl={externalUrl}>
                <div className={cn(
                    "relative h-full rounded-2xl overflow-hidden",
                    "bg-white border border-gray-100",
                    "shadow-sm hover:shadow-xl",
                    "transition-all duration-500 hover:-translate-y-1"
                )}>
                    {/* Image */}
                    <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
                        {featuredImage?.url ? (
                            <Image
                                src={featuredImage.url}
                                alt={featuredImage.alternativeText || title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                <span className="text-4xl">📰</span>
                            </div>
                        )}

                        {/* Video indicator */}
                        {videoUrl && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
                                </div>
                            </div>
                        )}

                        {/* External link indicator */}
                        {isExternal && (
                            <div className="absolute top-4 right-4">
                                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-md">
                                    <ExternalLink className="w-4 h-4 text-gray-600" />
                                </div>
                            </div>
                        )}

                        {/* Category badge */}
                        <div className="absolute top-4 left-4">
                            <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                                categoryColors.bg,
                                categoryColors.text
                            )}>
                                {categoryLabel}
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 md:p-6">
                        {/* Meta info */}
                        <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formattedDate}
                            </span>
                            {source && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="font-medium text-gray-700">{source}</span>
                                </>
                            )}
                            {eventLocation && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4" />
                                        {eventLocation}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Title */}
                        <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors duration-300">
                            {title}
                        </h3>

                        {/* Excerpt */}
                        {excerpt && (
                            <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                                {excerpt}
                            </p>
                        )}

                        {/* Customer info for testimonials */}
                        {category === 'customer_testimonial' && customerName && (
                            <div className="pt-4 border-t border-gray-100">
                                <p className="text-sm font-semibold text-gray-900">
                                    {customerName}
                                </p>
                                {customerCompany && (
                                    <p className="text-sm text-gray-500">{customerCompany}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </HighlightLink>
        </motion.article>
    );
}
