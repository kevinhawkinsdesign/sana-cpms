import { Metadata } from 'next';
import { Suspense } from 'react';
import ContactClient from '@/components/airtable/ContactClient';
import Loading from '@/components/shared/Loading';

// Cloudflare Image Transformation URL helper
const cloudflareUrl = (imagePath: string, width: number, quality: number = 80): string => 
  `https://next.gokabisa.com/cdn-cgi/image/width=${width},quality=${quality},format=webp${imagePath}`;

export const metadata: Metadata = {
  title: 'Contact Us | Kabisa',
  description: 'Get in touch with Kabisa - your trusted EV ecosystem partner in Rwanda. Visit our office, call us, or fill out our contact form.',
  openGraph: {
    title: 'Contact Us | Kabisa',
    description: 'Get in touch with Kabisa - your trusted EV ecosystem partner in Rwanda. Visit our office, call us, or fill out our contact form.',
    images: [
      {
        url: cloudflareUrl('/images/mundi-center.jpg', 1200, 85),
        width: 1200,
        height: 630,
        alt: 'Kabisa Office Location',
      },
    ],
  },
};

export default function ContactPage() {
  return (
    <Suspense fallback={<Loading fullScreen size="md" />}>
      <ContactClient />
    </Suspense>
  );
}