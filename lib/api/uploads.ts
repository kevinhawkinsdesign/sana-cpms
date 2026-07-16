import api from './api';

export interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

export interface MultipartInitResponse {
  uploadId: string;
  key: string;
  partSize: number;
  totalParts: number;
}

export interface PartPresignResponse {
  uploadUrl: string;
}

export interface MultipartCompleteResponse {
  publicUrl: string;
}

export async function requestPresignedUpload(
  contentType: string,
  context: string,
  entityId: string,
  suffix?: string,
): Promise<PresignResponse> {
  const res = await api().post('/api/uploads/presign', {
    contentType,
    context,
    entityId,
    ...(suffix && { suffix }),
  });
  return res.data.data;
}

export async function initiateMultipartUpload(
  contentType: string,
  fileSize: number,
  context: string,
  entityId: string,
  suffix?: string,
): Promise<MultipartInitResponse> {
  const res = await api().post('/api/uploads/multipart/initiate', {
    contentType,
    fileSize,
    context,
    entityId,
    ...(suffix && { suffix }),
  });
  return res.data.data;
}

export async function requestPartUploadUrl(
  key: string,
  uploadId: string,
  partNumber: number,
): Promise<PartPresignResponse> {
  const res = await api().post('/api/uploads/multipart/presign-part', {
    key,
    uploadId,
    partNumber,
  });
  return res.data.data;
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: Array<{ partNumber: number; etag: string }>,
): Promise<MultipartCompleteResponse> {
  const res = await api().post('/api/uploads/multipart/complete', {
    key,
    uploadId,
    parts,
  });
  return res.data.data;
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string,
): Promise<void> {
  await api().post('/api/uploads/multipart/abort', { key, uploadId });
}
