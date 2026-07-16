import { redirect } from 'next/navigation';

export default function CommercialVehiclesPage() {
  // Directly redirect to the PDF file to open it in browser
  redirect('/Kabisa commercial Vehicle Brochure 2026-Jan.Website.pdf');
}

