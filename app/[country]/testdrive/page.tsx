import { Metadata } from 'next';
import { Suspense } from 'react';
import TestDriveClient from '@/components/airtable/TestDriveClient';
import Loading from '@/components/shared/Loading';

export const metadata: Metadata = {
  title: 'Schedule a Test Drive | Kabisa',
  description: 'Book a test drive with Kabisa - experience our electric vehicles firsthand in Rwanda.',
  openGraph: {
    title: 'Schedule a Test Drive | Kabisa',
    description: 'Book a test drive with Kabisa - experience our electric vehicles firsthand in Rwanda.',
    images: [
      {
        url: '/images/testname.webp',
        width: 1200,
        height: 630,
        alt: 'Kabisa Test Drive',
      },
    ],
  },
};

export default function TestDrivePage() {
  return (
    <Suspense fallback={<Loading fullScreen size="md" />}>
      <TestDriveClient />
    </Suspense>
  );
}