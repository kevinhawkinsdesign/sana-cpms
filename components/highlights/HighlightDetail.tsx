'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BlocksRenderer } from '@strapi/blocks-react-renderer';
import { ArrowLeft, Calendar, MapPin, User, Building, Quote, ExternalLink } from 'lucide-react';
import { Highlight, HIGHLIGHT_CATEGORY_LABELS, HIGHLIGHT_CATEGORY_COLORS } from '@/types/highlight';
import { VideoEmbed } from './VideoEmbed';
import { ShareButtons } from './ShareButtons';
import { cn } from '@/lib/utils';

interface HighlightDetailProps {
    highlight: Highlight;
}

export function HighlightDetail({ highlight }: HighlightDetailProps) {
    const {
        title,
        category,
        excerpt,
        content,
        featuredImage,
        gallery,
        videoUrl,
        source,
        author,
        customerName,
        customerTitle,
        customerCompany,
        customerAvatar,
        eventDate,
        eventLocation,
        publishedDate,
        externalUrl
    } = highlight;

    const categoryLabel = HIGHLIGHT_CATEGORY_LABELS[category] || 'Story';
    const categoryColors = HIGHLIGHT_CATEGORY_COLORS[category] || { bg: 'bg-gray-100', text: 'text-gray-700' };

    const formattedDate = publishedDate
        ? new Date(publishedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : 'Recently published';

    const formattedEventDate = eventDate
        ? new Date(eventDate).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        })
        : null;

    const [shareUrl, setShareUrl] = useState('');

    useEffect(() => {
        setShareUrl(window.location.href);
    }, []);

    return (
        <article className="min-h-screen bg-white pt-20">
            {/* Navigation Bar */}
            <div className="sticky top-[72px] z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
                <div className="container mx-auto px-4 md:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-14">
                        <Link
                            href="."
                            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Stories
                        </Link>
                        <ShareButtons url={shareUrl} title={title} />
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gray-50">
                <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12 md:py-16">
                    <div className="max-w-4xl mx-auto">
                        {/* Category & Date */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-wrap items-center gap-3 mb-6"
                        >
                            <span className={cn(
                                "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold",
                                categoryColors.bg,
                                categoryColors.text
                            )}>
                                {categoryLabel}
                            </span>
                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                <Calendar className="w-4 h-4" />
                                {formattedDate}
                            </span>
                            {source && (
                                <span className="text-sm font-medium text-gray-700">
                                    {source}
                                </span>
                            )}
                        </motion.div>

                        {/* Title */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight"
                        >
                            {title}
                        </motion.h1>

                        {/* Excerpt */}
                        {excerpt && (
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-xl text-gray-600 leading-relaxed"
                            >
                                {excerpt}
                            </motion.p>
                        )}

                        {/* Author/Customer Info */}
                        {(author || customerName) && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex items-center gap-4 mt-8 pt-8 border-t border-gray-200"
                            >
                                {customerAvatar?.url ? (
                                    <Image
                                        src={customerAvatar.url}
                                        alt={customerName || 'Author'}
                                        width={56}
                                        height={56}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                                        <User className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {customerName || author}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {customerTitle}
                                        {customerTitle && customerCompany && ' at '}
                                        {customerCompany}
                                        {!customerTitle && !customerCompany && source}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 md:px-6 lg:px-8 py-12">
                <div className="max-w-4xl mx-auto">
                    {/* Video Player */}
                    {videoUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-12"
                        >
                            <VideoEmbed
                                url={videoUrl}
                                title={title}
                                thumbnailUrl={featuredImage?.url}
                            />
                        </motion.div>
                    )}

                    {/* Featured Image (if no video) */}
                    {!videoUrl && featuredImage?.url && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-12 rounded-2xl overflow-hidden"
                        >
                            <Image
                                src={featuredImage.url}
                                alt={featuredImage.alternativeText || title}
                                width={1200}
                                height={675}
                                className="w-full h-auto object-cover"
                                priority
                            />
                        </motion.div>
                    )}

                    {/* Customer Quote Block (for testimonials) */}
                    {category === 'customer_testimonial' && customerName && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-12 p-8 bg-primary/5 rounded-3xl border-l-4 border-primary"
                        >
                            <Quote className="w-10 h-10 text-primary/30 mb-4" />
                            <div className="flex items-center gap-4">
                                {customerAvatar?.url ? (
                                    <Image
                                        src={customerAvatar.url}
                                        alt={customerName}
                                        width={64}
                                        height={64}
                                        className="rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-8 h-8 text-primary/50" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-bold text-gray-900 text-lg">
                                        {customerName}
                                    </p>
                                    {customerTitle && (
                                        <p className="text-gray-500">
                                            {customerTitle}
                                        </p>
                                    )}
                                    {customerCompany && (
                                        <p className="flex items-center gap-1 text-gray-500 text-sm">
                                            <Building className="w-4 h-4" />
                                            {customerCompany}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Milestone Event Details */}
                    {category === 'milestone' && (formattedEventDate || eventLocation) && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-12 p-6 bg-amber-50 rounded-2xl border border-amber-100"
                        >
                            <h3 className="font-semibold text-amber-900 mb-3">
                                Event Details
                            </h3>
                            <div className="flex flex-wrap gap-6 text-amber-800">
                                {formattedEventDate && (
                                    <span className="flex items-center gap-2">
                                        <Calendar className="w-5 h-5" />
                                        {formattedEventDate}
                                    </span>
                                )}
                                {eventLocation && (
                                    <span className="flex items-center gap-2">
                                        <MapPin className="w-5 h-5" />
                                        {eventLocation}
                                    </span>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* External Link CTA */}
                    {externalUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mb-12"
                        >
                            <a
                                href={externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
                            >
                                Read Full Article on {source || 'Source'}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </motion.div>
                    )}

                    {/* Main Content */}
                    {content && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="prose prose-lg prose-gray max-w-none mb-12"
                        >
                            <BlocksRenderer content={content} />
                        </motion.div>
                    )}

                    {/* Image Gallery */}
                    {gallery && gallery.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="mb-12"
                        >
                            <h3 className="text-xl font-bold text-gray-900 mb-6">
                                Gallery
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {gallery.map((image, index) => (
                                    <motion.div
                                        key={image.url}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.5 + index * 0.1 }}
                                        className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
                                    >
                                        <Image
                                            src={image.url}
                                            alt={image.alternativeText || `Gallery image ${index + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 768px) 50vw, 33vw"
                                        />
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* Bottom Share & Navigation */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="py-8 border-t border-gray-100"
                    >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <ShareButtons url={shareUrl} title={title} />
                            <Link
                                href="."
                                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Back to all stories
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </div>
        </article>
    );
}
