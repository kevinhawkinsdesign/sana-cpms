'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { MapPin, Car, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { BlocksRenderer } from '@strapi/blocks-react-renderer';
import { Testimonial, TestimonialImage } from '@/lib/api/testimonials';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { StarRating } from './StarRating';

interface TestimonialItemProps {
    testimonial: Testimonial;
    index: number;
}

// Sub-component for image gallery with navigation
interface ImageGalleryProps {
    images: TestimonialImage[];
    currentIndex: number;
    onPrev: () => void;
    onNext: () => void;
    onSelect: (index: number) => void;
    onOpen: () => void;
    customerName: string;
    isFeatured?: boolean;
    priority?: boolean;
}

function ImageGallery({
    images,
    currentIndex,
    onPrev,
    onNext,
    onSelect,
    onOpen,
    customerName,
    isFeatured,
    priority
}: ImageGalleryProps) {
    if (!images || images.length === 0) return null;
    const safeIndex = Math.min(currentIndex, images.length - 1);
    const currentImage = images[safeIndex];
    if (!currentImage?.url) return null;
    const hasMultiple = images.length > 1;

    return (
        <div
            className="relative aspect-[4/5] rounded-3xl overflow-hidden cursor-pointer group"
            onClick={onOpen}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen();
                }
            }}
        >
            <Image
                src={currentImage.url}
                alt={currentImage.alternativeText || customerName}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={priority}
            />
            {hasMultiple && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onPrev(); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNext(); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-all opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); onSelect(idx); }}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    currentIndex === idx ? "bg-white w-6" : "bg-white/50"
                                )}
                            />
                        ))}
                    </div>
                </>
            )}
            {isFeatured && (
                <div className="absolute top-4 left-4 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    Featured
                </div>
            )}
        </div>
    );
}

// Sub-component for testimonial content
interface TestimonialContentProps {
    rating: number;
    testimonialContent: Testimonial['testimonialContent'];
    location?: string;
    vehicleModel?: string;
    monthlySavings?: number;
    customerAvatar?: TestimonialImage;
    customerName: string;
    initials: string;
    jobTitle?: string;
    companyName?: string;
    service?: string;
    showFeaturedBadge?: boolean;
}

function TestimonialContentSection({
    rating,
    testimonialContent,
    location,
    vehicleModel,
    monthlySavings,
    customerAvatar,
    customerName,
    initials,
    jobTitle,
    companyName,
    service,
    showFeaturedBadge
}: TestimonialContentProps) {
    return (
        <div className="space-y-6">
            {showFeaturedBadge && (
                <span className="inline-block bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Featured
                </span>
            )}
            <StarRating rating={rating} />
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-light text-gray-900 leading-snug">
                <BlocksRenderer content={testimonialContent} />
            </blockquote>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                {location && (
                    <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {location}
                    </span>
                )}
                {vehicleModel && (
                    <span className="flex items-center gap-1">
                        <Car className="w-3 h-3" /> {vehicleModel}
                    </span>
                )}
                {monthlySavings && monthlySavings > 0 && (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        Saves ${monthlySavings}/mo
                    </span>
                )}
            </div>
            <div className="flex items-center gap-4 pt-4">
                {customerAvatar?.url ? (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <Image src={customerAvatar.url} alt={customerName} fill className="object-cover" sizes="48px" />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                        {initials}
                    </div>
                )}
                <div>
                    <p className="font-bold text-gray-900">{customerName}</p>
                    <p className="text-sm text-gray-500">
                        {jobTitle}{jobTitle && companyName && ' · '}{companyName}
                        {!jobTitle && !companyName && service}
                    </p>
                </div>
            </div>
        </div>
    );
}

export function TestimonialItem({ testimonial, index }: TestimonialItemProps) {
    const {
        customerName,
        customerAvatar,
        photos,
        testimonialContent,
        rating = 5,
        service,
        vehicleModel,
        location,
        companyName,
        jobTitle,
        isFeatured,
        monthlySavings
    } = testimonial;

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);

    const allImages: TestimonialImage[] = [
        ...(photos || []),
        ...(customerAvatar && (!photos || photos.length === 0) ? [customerAvatar] : [])
    ];

    const hasMultipleImages = allImages.length > 1;
    const hasImages = allImages.length > 0;
    const safeCurrentIndex = hasImages ? Math.min(currentImageIndex, allImages.length - 1) : 0;
    const currentImage = hasImages ? allImages[safeCurrentIndex] : null;

    const nextImage = () => {
        if (allImages.length > 0) {
            setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
        }
    };
    const prevImage = () => {
        if (allImages.length > 0) {
            setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
        }
    };

    const initials = (customerName || '').split(' ').map((n) => n?.[0] || '').join('').toUpperCase().slice(0, 2) || '?';

    const layoutStyle = index % 3;

    const contentProps: TestimonialContentProps = {
        rating,
        testimonialContent,
        location,
        vehicleModel,
        monthlySavings,
        customerAvatar,
        customerName,
        initials,
        jobTitle,
        companyName,
        service
    };

    const galleryProps: Omit<ImageGalleryProps, 'priority'> = {
        images: allImages,
        currentIndex: currentImageIndex,
        onPrev: prevImage,
        onNext: nextImage,
        onSelect: setCurrentImageIndex,
        onOpen: () => setLightboxOpen(true),
        customerName,
        isFeatured
    };

    return (
        <>
            <motion.article
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8 }}
                className="relative"
            >
                {/* Layout 0: Image LEFT, Text RIGHT */}
                {layoutStyle === 0 && (
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div>{hasImages && <ImageGallery {...galleryProps} priority={index === 0} />}</div>
                        <TestimonialContentSection {...contentProps} />
                    </div>
                )}

                {/* Layout 1: Text LEFT, Image RIGHT */}
                {layoutStyle === 1 && (
                    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
                        <div className="order-2 md:order-1">
                            <TestimonialContentSection {...contentProps} showFeaturedBadge={isFeatured} />
                        </div>
                        <div className="order-1 md:order-2">
                            {hasImages && <ImageGallery {...galleryProps} isFeatured={false} />}
                        </div>
                    </div>
                )}

                {/* Layout 2: Image grid with floating quote */}
                {layoutStyle === 2 && (
                    <div className="relative">
                        {hasImages && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {allImages.slice(0, 3).filter(img => img?.url).map((img, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "relative rounded-2xl overflow-hidden cursor-pointer group",
                                            idx === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[4/3]"
                                        )}
                                        onClick={() => { setCurrentImageIndex(idx); setLightboxOpen(true); }}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setCurrentImageIndex(idx); setLightboxOpen(true);
                                            }
                                        }}
                                    >
                                        <Image
                                            src={img.url}
                                            alt={img.alternativeText || `${customerName} photo ${idx + 1}`}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            sizes={idx === 0 ? "66vw" : "33vw"}
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                                        {idx === 0 && isFeatured && (
                                            <div className="absolute top-4 left-4 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                                                Featured
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="md:absolute md:bottom-8 md:right-8 md:w-96 mt-6 md:mt-0 bg-white md:shadow-2xl rounded-2xl p-6 md:p-8">
                            <StarRating rating={rating} size="sm" className="mb-4" />
                            <div className="text-gray-700 leading-relaxed mb-6">
                                <BlocksRenderer content={testimonialContent} />
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                                {customerAvatar?.url && (
                                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                                        <Image src={customerAvatar.url} alt={customerName} fill className="object-cover" sizes="40px" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-gray-900 text-sm">{customerName}</p>
                                    <p className="text-xs text-gray-500">{location || service}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </motion.article>

            {/* Lightbox */}
            <AnimatePresence>
                {lightboxOpen && currentImage?.url && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black flex items-center justify-center"
                        onClick={() => setLightboxOpen(false)}
                    >
                        <button
                            onClick={() => setLightboxOpen(false)}
                            className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X className="w-6 h-6 text-white" />
                        </button>

                        <div className="relative w-full h-full p-4 md:p-12" onPointerDown={(e) => e.stopPropagation()}>
                            <Image
                                src={currentImage.url}
                                alt={currentImage.alternativeText || customerName}
                                fill
                                className="object-contain"
                                sizes="100vw"
                            />
                        </div>

                        {hasMultipleImages && (
                            <>
                                <button
                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                    className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <ChevronLeft className="w-7 h-7 text-white" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <ChevronRight className="w-7 h-7 text-white" />
                                </button>
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                                    {allImages.filter(img => img?.url).map((img, idx) => (
                                        <button
                                            key={idx}
                                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                            className={cn(
                                                "relative w-16 h-12 rounded-lg overflow-hidden transition-all",
                                                safeCurrentIndex === idx ? "ring-2 ring-white" : "opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            <Image src={img.url} alt="" fill className="object-cover" sizes="64px" />
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
