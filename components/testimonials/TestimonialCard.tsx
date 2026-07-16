'use client';

import React from 'react';
import Image from 'next/image';
import { Quote } from 'lucide-react';
import { BlocksRenderer } from '@strapi/blocks-react-renderer';
import { Testimonial } from '@/lib/api/testimonials';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { StarRating } from './StarRating';

interface TestimonialCardProps {
    testimonial: Testimonial;
    className?: string;
    variant?: 'default' | 'featured';
}

export function TestimonialCard({ testimonial, className, variant = 'default' }: TestimonialCardProps) {
    const {
        customerName,
        customerAvatar,
        testimonialContent,
        rating = 5,
        service
    } = testimonial;

    // service is normalized by the API mapper; use it directly
    const Service = service;

    const initials = (customerName || '')
        .split(' ')
        .map((n) => n?.[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?';

    const isFeatured = variant === 'featured';

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={cn("group", className)}
        >
            <div className={cn(
                "relative h-full rounded-3xl p-6 md:p-8 transition-all duration-500",
                "bg-white dark:bg-gray-900",
                "border border-gray-100 dark:border-gray-800",
                "shadow-[0_4px_40px_-12px_rgba(0,0,0,0.1)]",
                "hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]",
                "hover:border-primary/20",
                "hover:-translate-y-2",
                isFeatured && "md:col-span-2 bg-gradient-to-br from-primary/5 via-white to-white dark:from-primary/10 dark:via-gray-900 dark:to-gray-900"
            )}>
                {/* Decorative gradient blob */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 -z-10" />

                {/* Quote icon */}
                <div className="absolute top-6 right-6 md:top-8 md:right-8">
                    <Quote className="h-8 w-8 md:h-10 md:w-10 text-primary/10 rotate-180 group-hover:text-primary/20 transition-colors duration-300" />
                </div>

                {/* Stars */}
                <StarRating rating={rating} className="gap-1 mb-6" animated />

                {/* Service badge */}
                {Service && (
                    <div className="mb-4">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary tracking-wide uppercase">
                            {Service}
                        </span>
                    </div>
                )}

                {/* Testimonial content */}
                <div className={cn(
                    "prose prose-gray dark:prose-invert max-w-none mb-8",
                    "text-gray-600 dark:text-gray-300",
                    "leading-relaxed",
                    isFeatured ? "text-lg md:text-xl" : "text-base"
                )}>
                    <BlocksRenderer content={testimonialContent} />
                </div>

                {/* Author section */}
                <div className="flex items-center gap-4 pt-6 border-t border-gray-100 dark:border-gray-800">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary/50 blur opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
                        <div className={cn(
                            "relative rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800 shadow-lg",
                            isFeatured ? "w-16 h-16" : "w-14 h-14"
                        )}>
                            {customerAvatar?.url ? (
                                <Image
                                    src={customerAvatar.url}
                                    alt={customerAvatar.alternativeText || customerName}
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 56px, 64px"
                                />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">{initials}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Name */}
                    <div className="min-w-0">
                        <h4 className={cn(
                            "font-bold text-gray-900 dark:text-white truncate",
                            isFeatured ? "text-lg" : "text-base"
                        )}>
                            {customerName}
                        </h4>
                        {Service && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {Service} Customer
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
