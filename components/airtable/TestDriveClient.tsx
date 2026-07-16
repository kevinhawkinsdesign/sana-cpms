'use client';

import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import PageHeroBanner from '@/components/shared/PageHeroBanner';
import AirtableLoader from '@/components/shared/AirtableLoader';
import { AIRTABLE_FORMS, AIRTABLE_FIELDS } from '@/lib/utils/airtable';

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

const TestDriveClient = () => {
  const searchParams = useSearchParams();
  
  // Build the Airtable form URL with pre-filled vehicle name
  const formUrl = useMemo(() => {
    const baseUrl = AIRTABLE_FORMS.TEST_DRIVE;
    const car = searchParams.get('car');

    if (car) {
      const encodedFieldName = encodeURIComponent(AIRTABLE_FIELDS.TEST_DRIVE_VEHICLE);
      return `${baseUrl}?prefill_${encodedFieldName}=${encodeURIComponent(car)}`;
    }

    return baseUrl;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeroBanner
        title="Test Drive"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Test Drive" }]}
        backgroundImage={cloudflareUrl('/images/testname.webp', 1920, 75)}
        height="medium"
        overlay="medium"
        align="left"
      />

      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Card>
            <CardContent className="p-8">
              <AirtableLoader
                formUrl={formUrl}
                height="960px"
                className="w-full"
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default TestDriveClient;