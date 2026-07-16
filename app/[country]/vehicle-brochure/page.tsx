import { redirect } from 'next/navigation';

interface VehicleBrochurePageProps {
  params: Promise<{ country: string }>;
}

export default async function VehicleBrochurePage({ params }: VehicleBrochurePageProps) {
  const { country } = await params;
  
  // For Kenya, redirect to Kenya-specific brochure
  if (country.toLowerCase() === 'ke') {
    redirect('/Kenya Kabisa Vehicle Brochure 2026.pdf');
  }
  
  // For other countries (Rwanda), redirect to general vehicle brochure
  redirect('/kabisa-vehicle-brochure.pdf');
}

