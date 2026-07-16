import { Metadata } from 'next';
import BrochuresDownload from '@/components/shared/BrochuresDownload';

export const metadata: Metadata = {
  title: 'Download Brochures | Kabisa',
  description: 'Download our vehicle and charging brochures to learn more about Kabisa\'s EV ecosystem solutions, specifications, and services.',
  keywords: 'EV brochures, electric vehicle specifications, EV charging details, Kabisa PDF downloads'
};

export default function BrochureDownloadPage() {
  return <BrochuresDownload />;
}