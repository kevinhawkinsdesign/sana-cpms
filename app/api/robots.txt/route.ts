import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('host') || ''
  
  // Block test subdomain
  if (host === 'test.gokabisa.com') {
    const robotsTxt = `User-agent: *
Disallow: /

# This is a test environment - no crawling allowed`
    
    return new NextResponse(robotsTxt, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  }
  
  // Allow crawling for all other domains
  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: https://${host}/sitemap.xml`
  
  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  })
} 