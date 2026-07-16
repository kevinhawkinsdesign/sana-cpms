// app/[country]/page.tsx
import { Metadata } from 'next'
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

export async function generateStaticParams() {
  return [{ country: 'rw' }, { country: 'ke' }];
}

export const metadata: Metadata = {
  title: 'Kabisa - Leading EV Ecosystem in Africa',
  description:
    "Explore Kabisa's full EV ecosystem: EV sales, importing, charging stations, and maintenance. Join us in driving sustainable transportation forward in Rwanda and Africa.",
  openGraph: {
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Kabisa - Leading EV Ecosystem in Africa',
      },
    ],
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  other: {
    link: [
      'preconnect:https://fonts.googleapis.com',
      'preconnect:https://fonts.gstatic.com:crossorigin',
      'preload:/assets/hero-bg.webp:image:high'
    ],
  },
}

const HomeClient = dynamic(
  () => import('@/components/home/HomeClient'),
  { ssr: true }
)

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-screen bg-gray-900 animate-pulse"
          aria-label="Loading homepage…"
        />
      }
    >
      <HomeClient />
    </Suspense>
  )
}