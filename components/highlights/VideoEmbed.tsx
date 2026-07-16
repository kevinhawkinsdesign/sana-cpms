'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoEmbedProps {
    url: string;
    title?: string;
    thumbnailUrl?: string;
    className?: string;
}

export function VideoEmbed({ url, title = 'Video', thumbnailUrl, className }: VideoEmbedProps) {
    const [isPlaying, setIsPlaying] = useState(false);

    // Extract YouTube video ID
    const getYouTubeId = (videoUrl: string): string | null => {
        const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
        return match ? match[1] : null;
    };

    // Extract Vimeo video ID
    const getVimeoId = (videoUrl: string): string | null => {
        const match = videoUrl.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const youtubeId = getYouTubeId(url);
    const vimeoId = getVimeoId(url);

    const thumbnailSrc = thumbnailUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg` : null);

    const embedUrl = youtubeId
        ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`
        : vimeoId
            ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
            : url;

    if (!youtubeId && !vimeoId) {
        return (
            <div className={cn("aspect-video bg-gray-100 rounded-2xl flex items-center justify-center", className)}>
                <p className="text-gray-500">Unsupported video format</p>
            </div>
        );
    }

    return (
        <div className={cn("relative aspect-video rounded-2xl overflow-hidden bg-gray-900", className)}>
            {!isPlaying ? (
                <button
                    onClick={() => setIsPlaying(true)}
                    className="w-full h-full relative group"
                    aria-label={`Play ${title}`}
                >
                    {/* Thumbnail */}
                    {thumbnailSrc && (
                        <Image
                            src={thumbnailSrc}
                            alt={title}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
                        />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors duration-300" />

                    {/* Play button */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/90 flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-8 h-8 md:w-10 md:h-10 text-gray-900 ml-1" fill="currentColor" />
                        </div>
                    </div>
                </button>
            ) : (
                <iframe
                    src={embedUrl}
                    title={title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                />
            )}
        </div>
    );
}
