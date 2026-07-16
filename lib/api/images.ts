// Frontend helper to request a Cloudflare Images direct-upload URL from our API

export interface DirectUploadResponse {
  uploadURL: string;
  id?: string;
}

export async function getCloudflareDirectUploadUrl(): Promise<DirectUploadResponse> {
  const res = await fetch('/api/images/direct-upload', { method: 'GET' });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error || 'Failed to get direct upload URL');
  }

  return data as DirectUploadResponse;
}