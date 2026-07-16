'use client';

import { useState, useCallback, useRef } from 'react';
import {
  requestPresignedUpload,
  initiateMultipartUpload,
  requestPartUploadUrl,
  completeMultipartUpload,
  abortMultipartUpload,
} from '@/lib/api/uploads';
import { normalizeImage } from '@/lib/utils/normalizeImage';

const SIMPLE_UPLOAD_THRESHOLD = 5 * 1024 * 1024; // 5MB
const MAX_RETRIES = 3;
const SESSION_STORAGE_PREFIX = 'r2_upload_';

interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
}

interface PendingUpload {
  key: string;
  uploadId: string;
  completedParts: Array<{ partNumber: number; etag: string }>;
  totalParts: number;
  partSize: number;
  context: string;
  entityId: string;
  fileSize: number;
  fileName: string;
}

function savePendingUpload(context: string, entityId: string, data: PendingUpload) {
  try {
    sessionStorage.setItem(`${SESSION_STORAGE_PREFIX}${context}_${entityId}`, JSON.stringify(data));
  } catch {
    // sessionStorage may be unavailable
  }
}

function loadPendingUpload(context: string, entityId: string): PendingUpload | null {
  try {
    const raw = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${context}_${entityId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearPendingUpload(context: string, entityId: string) {
  try {
    sessionStorage.removeItem(`${SESSION_STORAGE_PREFIX}${context}_${entityId}`);
  } catch {
    // ignore
  }
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOnline(abortRef?: React.MutableRefObject<boolean>, timeoutMs = 30_000): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine) return;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      window.removeEventListener('online', handler);
      clearInterval(abortCheck);
      reject(new Error('Network timeout — still offline after 30s'));
    }, timeoutMs);

    const abortCheck = abortRef
      ? setInterval(() => {
          if (abortRef.current) {
            clearTimeout(timer);
            window.removeEventListener('online', handler);
            clearInterval(abortCheck);
            reject(new Error('Upload aborted'));
          }
        }, 500)
      : undefined;

    const handler = () => {
      clearTimeout(timer);
      if (abortCheck) clearInterval(abortCheck);
      window.removeEventListener('online', handler);
      resolve();
    };
    window.addEventListener('online', handler);
  });
}

export function useR2Upload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  });
  const abortRef = useRef(false);

  const upload = useCallback(
    async (
      file: File,
      context: string,
      entityId: string,
      suffix?: string,
    ): Promise<string> => {
      abortRef.current = false;
      setState({ isUploading: true, progress: 0, error: null });

      try {
        const prepared = await normalizeImage(file);
        let publicUrl: string;

        if (prepared.size < SIMPLE_UPLOAD_THRESHOLD) {
          publicUrl = await simpleUpload(prepared, context, entityId, suffix, setState);
        } else {
          publicUrl = await multipartUpload(prepared, context, entityId, suffix, setState, abortRef);
        }

        setState({ isUploading: false, progress: 100, error: null });
        clearPendingUpload(context, entityId);
        return publicUrl;
      } catch (err: any) {
        const message = err?.message || 'Upload failed';
        setState({ isUploading: false, progress: 0, error: message });
        throw err;
      }
    },
    [],
  );

  const abort = useCallback(
    async (context: string, entityId: string) => {
      abortRef.current = true;
      const pending = loadPendingUpload(context, entityId);
      if (pending) {
        try {
          await abortMultipartUpload(pending.key, pending.uploadId);
        } catch {
          // best-effort cleanup
        }
        clearPendingUpload(context, entityId);
      }
      setState({ isUploading: false, progress: 0, error: null });
    },
    [],
  );

  return {
    upload,
    abort,
    isUploading: state.isUploading,
    progress: state.progress,
    error: state.error,
  };
}

// ── Simple presigned PUT upload (< 5MB) ──

async function simpleUpload(
  file: File,
  context: string,
  entityId: string,
  suffix: string | undefined,
  setState: React.Dispatch<React.SetStateAction<UploadState>>,
): Promise<string> {
  setState((s) => ({ ...s, progress: 10 }));

  const { uploadUrl, publicUrl } = await requestPresignedUpload(
    file.type,
    context,
    entityId,
    suffix,
  );

  setState((s) => ({ ...s, progress: 30 }));

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}`);
  }

  setState((s) => ({ ...s, progress: 100 }));
  return publicUrl;
}

// ── Multipart chunked upload (>= 5MB) ──

async function multipartUpload(
  file: File,
  context: string,
  entityId: string,
  suffix: string | undefined,
  setState: React.Dispatch<React.SetStateAction<UploadState>>,
  abortRef: React.MutableRefObject<boolean>,
): Promise<string> {
  // Check for a resumable pending upload — only resume if the file matches
  let pending = loadPendingUpload(context, entityId);
  let key: string;
  let uploadId: string;
  let partSize: number;
  let totalParts: number;
  let completedParts: Array<{ partNumber: number; etag: string }>;

  const canResume =
    pending &&
    pending.totalParts > 0 &&
    pending.fileSize === file.size &&
    pending.fileName === file.name;

  if (canResume && pending) {
    // Resume — same file
    key = pending.key;
    uploadId = pending.uploadId;
    partSize = pending.partSize;
    totalParts = pending.totalParts;
    completedParts = pending.completedParts;
  } else {
    // Abort stale pending upload if it exists but doesn't match
    if (pending && pending.uploadId) {
      try {
        await abortMultipartUpload(pending.key, pending.uploadId);
      } catch {
        // best-effort cleanup
      }
      clearPendingUpload(context, entityId);
    }

    // Start fresh
    const init = await initiateMultipartUpload(
      file.type,
      file.size,
      context,
      entityId,
      suffix,
    );
    key = init.key;
    uploadId = init.uploadId;
    partSize = init.partSize;
    totalParts = init.totalParts;
    completedParts = [];

    savePendingUpload(context, entityId, {
      key,
      uploadId,
      completedParts,
      totalParts,
      partSize,
      context,
      entityId,
      fileSize: file.size,
      fileName: file.name,
    });
  }

  const completedSet = new Set(completedParts.map((p) => p.partNumber));

  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    if (abortRef.current) throw new Error('Upload aborted');
    if (completedSet.has(partNumber)) continue; // Already uploaded (resume)

    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, file.size);
    const chunk = file.slice(start, end);

    let uploaded = false;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (abortRef.current) throw new Error('Upload aborted');

      // Wait for network if offline (abortable, with timeout)
      await waitForOnline(abortRef);

      try {
        const { uploadUrl } = await requestPartUploadUrl(key, uploadId, partNumber);

        const response = await fetch(uploadUrl, {
          method: 'PUT',
          body: chunk,
        });

        if (!response.ok) {
          throw new Error(`Part ${partNumber} upload failed: ${response.status}`);
        }

        const etag = response.headers.get('etag') || '';
        completedParts.push({ partNumber, etag });

        // Save checkpoint
        savePendingUpload(context, entityId, {
          key,
          uploadId,
          completedParts,
          totalParts,
          partSize,
          context,
          entityId,
          fileSize: file.size,
          fileName: file.name,
        });

        uploaded = true;
        break;
      } catch (err) {
        if (abortRef.current) throw new Error('Upload aborted');
        if (attempt < MAX_RETRIES - 1) {
          await sleep(1000 * Math.pow(2, attempt)); // 1s, 2s, 4s
        }
      }
    }

    if (!uploaded) {
      throw new Error(`Failed to upload part ${partNumber} after ${MAX_RETRIES} retries`);
    }

    const pct = Math.round((completedParts.length / totalParts) * 95) + 5; // 5-100
    setState((s) => ({ ...s, progress: pct }));
  }

  // Complete
  const result = await completeMultipartUpload(key, uploadId, completedParts);
  return result.publicUrl;
}
