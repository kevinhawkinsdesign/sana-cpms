
'use client';

import React, { Suspense, useEffect } from "react";
import Chargermap from "@/components/charger/chargeMap";
import { Skeleton } from "@/components/ui/skeleton";
import { useClarity } from "@/lib/hooks/useClarity";

const ChargePage = () => {
    const { trackEvent } = useClarity();

    // Track charge page view
    useEffect(() => {
        trackEvent('charge_map_page_viewed', {
            page: 'charge_map',
            map_type: 'full_screen'
        });
    }, [trackEvent]);

    return (
        <div className="min-h-[calc(100vh-64px)] pt-0 pb-0">
            <div className="w-full h-full">
                <div className="w-full h-[calc(100vh-64px)] rounded-none overflow-hidden shadow-none">
                    <Suspense
                        fallback={
                            <div className="relative w-full h-full">
                                <Skeleton className="absolute inset-0 w-full h-full" />
                                {/* Simulate map markers as pulsing circles */}
                                <div className="absolute left-1/3 top-1/3 w-8 h-8 bg-primary/20 rounded-full animate-pulse" />
                                <div className="absolute left-2/3 top-1/2 w-8 h-8 bg-primary/20 rounded-full animate-pulse" />
                                <div className="absolute left-1/2 top-2/3 w-8 h-8 bg-primary/20 rounded-full animate-pulse" />
                                {/* Simulate a search bar skeleton */}
                                <Skeleton className="absolute left-4 top-8 w-64 h-10" />
                            </div>
                        }
                    >
                        <Chargermap useDark={true} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default ChargePage;