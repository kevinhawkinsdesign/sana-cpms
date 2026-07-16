// app/[country]/layout.tsx
import { notFound, redirect } from 'next/navigation'
import { ReactNode } from 'react'
import { CountryProvider } from '@/lib/providers/country-provider'
import ClientLayout from './client-layout'

interface CountryLayoutProps {
  children: ReactNode
  params: Promise<{ country: string }>
}

const supportedCountries = ['rw', 'ke']

export function generateStaticParams() {
  return supportedCountries.map((country) => ({ country }))
}

export default async function CountryLayout({ children, params }: CountryLayoutProps) {
  const { country: countryParam } = await params
  const country = countryParam.toLowerCase()

  // Validate country code
  if (!supportedCountries.includes(country)) {
    notFound()
  }

  // Redirect if country code is uppercase
  if (countryParam !== country) {
    redirect(`/${country}`)
  }

  return (
    <CountryProvider countryCode={country as 'rw' | 'ke'}>
      <ClientLayout>{children}</ClientLayout>
    </CountryProvider>
  )
}