import { NextRequest, NextResponse } from 'next/server';

// Creates a Cloudflare Images Direct Upload URL
// Requires env vars: CF_IMAGES_ACCOUNT_ID, CF_IMAGES_API_TOKEN
export async function GET(_req: NextRequest) {
  try {
    const accountId = process.env.CF_IMAGES_ACCOUNT_ID;
    const apiToken = process.env.CF_IMAGES_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({
        error: 'Cloudflare Images is not configured. Missing CF_IMAGES_ACCOUNT_ID or CF_IMAGES_API_TOKEN.'
      }, { status: 500 });
    }

    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v2/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Check content type before parsing
    const contentType = cfResponse.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    let data;
    if (isJson) {
      data = await cfResponse.json();
    } else {
      return NextResponse.json(
        { 
          error: `Cloudflare API error (${cfResponse.status}): ${cfResponse.statusText}.` 
        },
        { status: 500 }
      );
    }

    if (!cfResponse.ok || !data?.success) {
      const message = data?.errors?.[0]?.message || 'Failed to create direct upload URL';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Return the uploadURL and any additional info
    return NextResponse.json({
      uploadURL: data?.result?.uploadURL,
      id: data?.result?.id,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unexpected error' }, { status: 500 });
  }
}