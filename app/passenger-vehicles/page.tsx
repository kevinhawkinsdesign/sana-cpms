import { redirect } from 'next/navigation';

export default function PassengerVehiclesPage() {
  // Directly redirect to the PDF file to open it in browser
  redirect('/Kabisa Passenger Vehicle Brochure 2026- Jan.Website.pdf');
}

