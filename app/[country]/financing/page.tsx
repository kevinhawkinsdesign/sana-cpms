import { Metadata } from 'next';
import { Suspense } from 'react';
import FinancingClient from '@/components/financing/FinancingClient';
import Loading from '@/components/shared/Loading';


const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

export const metadata: Metadata = {
  title: 'Vehicle Financing | Kabisa',
  description: 'Explore financing options for electric vehicles in Rwanda with Kabisa. We partner with leading financial institutions to make EV ownership affordable.',
  openGraph: {
    title: 'Vehicle Financing | Kabisa',
    description: 'Explore financing options for electric vehicles in Rwanda with Kabisa. We partner with leading financial institutions to make EV ownership affordable.',
    images: [
      {
        url: cloudflareUrl('/images/finance.webp', 1200, 85),
        width: 1200,
        height: 630,
        alt: 'Kabisa Financing Options',
      },
    ],
  },
};

export default function FinancingPage() {
  return (
    <Suspense fallback={<Loading fullScreen size="md" />}>
      <FinancingClient />
    </Suspense>
  );
}