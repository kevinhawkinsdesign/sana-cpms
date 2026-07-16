import { redirect } from 'next/navigation';

export default function EVChargingPage() {
  // Directly redirect to the PDF file to open it in browser
  redirect('/Kabisa+EV+charger+Brochure.pdf');
}

