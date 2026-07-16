'use client';

import React from 'react';
import { motion } from 'framer-motion';
import PageHeroBanner from '@/components/shared/PageHeroBanner';
import AirtableLoader from '@/components/shared/AirtableLoader';

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

const MaintenanceRequestClient = () => {

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <PageHeroBanner
        title="Maintenance"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Maintenance" }]}
        backgroundImage={cloudflareUrl('/images/garage.webp', 1920, 75)}
        height="medium"
        overlay="medium"
        align="left"
      />

      <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 lg:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
            <AirtableLoader
              formUrl="https://airtable.com/embed/appXpIapfoCVnPaZJ/pagOlaCkqK94Noal5/form"
              height="750px"
              className="w-full"
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MaintenanceRequestClient;