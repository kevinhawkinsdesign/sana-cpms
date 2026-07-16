import { Metadata } from 'next';
import { Suspense } from 'react';
import MaintenanceRequestClient from '@/components/airtable/MaintenanceRequestClient';
import Loading from '@/components/shared/Loading';

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

export const metadata: Metadata = {
  title: 'Maintenance Request | Kabisa',
  description: 'Request vehicle maintenance services from Kabisa - your trusted EV maintenance partner in Rwanda.',
  openGraph: {
    title: 'Maintenance Request | Kabisa',
    description: 'Request vehicle maintenance services from Kabisa - your trusted EV maintenance partner in Rwanda.',
    images: [
      {
        url: cloudflareUrl('/images/testimage.webp', 1200, 85),
        width: 1200,
        height: 630,
        alt: 'Kabisa Maintenance Services',
      },
    ],
  },
};

export default function MaintenanceRequestPage() {
  return (
    <Suspense fallback={<Loading fullScreen size="md" />}>
      <MaintenanceRequestClient />
    </Suspense>
  );
}