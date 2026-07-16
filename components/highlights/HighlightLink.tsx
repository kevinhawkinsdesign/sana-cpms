'use client';

import React from 'react';
import { LocalizedLink } from '@/components/shared/LocalizedLink';

interface HighlightLinkProps {
    slug: string;
    externalUrl?: string;
    children: React.ReactNode;
    className?: string;
}

/**
 * Shared link component for highlight cards.
 * Renders external link for press articles or internal LocalizedLink for detail pages.
 */
export function HighlightLink({ slug, externalUrl, children, className = "block h-full" }: HighlightLinkProps) {
    if (externalUrl) {
        return (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" className={className}>
                {children}
            </a>
        );
    }

    return (
        <LocalizedLink href={`/highlights/${slug}`} className={className}>
            {children}
        </LocalizedLink>
    );
}
