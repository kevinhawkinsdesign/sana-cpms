'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { LocalizedLink } from '@/components/shared/LocalizedLink';
import { HighlightsPageSettings } from '@/types/highlight';

interface HighlightsCtaSectionProps {
    settings: HighlightsPageSettings;
}

export function HighlightsCtaSection({ settings }: HighlightsCtaSectionProps) {
    const {
        ctaHeading,
        ctaBookTestDriveText,
        ctaBookTestDriveLink,
        ctaFleetConsultationText,
        ctaFleetConsultationLink,
        ctaLetsPartnerText,
        ctaLetsPartnerLink,
        ctaContactUsText,
        ctaContactUsLink,
    } = settings;

    return (
        <section className="py-16 md:py-24 bg-white">
            <div className="container mx-auto px-4 md:px-6 lg:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center max-w-3xl mx-auto"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-8">
                        {ctaHeading}
                    </h2>

                    <div className="flex flex-wrap justify-center gap-4">
                        <Button
                            asChild
                            size="lg"
                            className="rounded-full px-8"
                        >
                            <LocalizedLink href={ctaBookTestDriveLink}>
                                {ctaBookTestDriveText}
                            </LocalizedLink>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="rounded-full px-8"
                        >
                            <LocalizedLink href={ctaFleetConsultationLink}>
                                {ctaFleetConsultationText}
                            </LocalizedLink>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="rounded-full px-8"
                        >
                            <LocalizedLink href={ctaLetsPartnerLink}>
                                {ctaLetsPartnerText}
                            </LocalizedLink>
                        </Button>

                        <Button
                            asChild
                            size="lg"
                            variant="outline"
                            className="rounded-full px-8"
                        >
                            <LocalizedLink href={ctaContactUsLink}>
                                {ctaContactUsText}
                            </LocalizedLink>
                        </Button>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

