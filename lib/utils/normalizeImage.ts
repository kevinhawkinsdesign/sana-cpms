import piexif, { type ExifObject } from 'piexifjs';
import exifr from 'exifr';

const JPEG_QUALITY = 0.92;
const MAX_DIMENSION = 4096;

const HEIC_TYPE_RE = /heic|heif/i;
const HEIC_NAME_RE = /\.(heic|heif)$/i;

type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export async function normalizeImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/png' || file.type === 'image/webp') return file;

  try {
    const isHeic = HEIC_TYPE_RE.test(file.type) || HEIC_NAME_RE.test(file.name);

    let preservedExif: Record<string, unknown> | null = null;
    // Only used for the HEIC path: heic2any strips all metadata and does not
    // bake rotation into pixels, so we must rotate manually using the
    // orientation we read from the original HEIC file.
    let heicOrientation: Orientation = 1;

    if (isHeic) {
      try {
        const parsed = (await exifr.parse(file, {
          tiff: true,
          exif: true,
          gps: true,
          ifd1: false,
        })) as Record<string, unknown> | null;
        preservedExif = parsed;
        const o = parsed?.Orientation;
        if (typeof o === 'number' && o >= 1 && o <= 8) {
          heicOrientation = o as Orientation;
        }
      } catch {
        preservedExif = null;
      }
    }

    let workingBlob: Blob = file;
    let outName = file.name;
    if (isHeic) {
      const { default: heic2any } = await import('heic2any');
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: JPEG_QUALITY,
      });
      workingBlob = Array.isArray(converted) ? converted[0] : converted;
      outName = file.name.replace(HEIC_NAME_RE, '.jpg');
    }

    let originalExifObj: ExifObject | null = null;
    if (!isHeic && file.type === 'image/jpeg') {
      try {
        const originalDataUrl = await blobToDataUrl(workingBlob);
        originalExifObj = piexif.load(originalDataUrl);
      } catch {
        originalExifObj = null;
      }
    }

    // For non-HEIC JPEGs, workingBlob retains its EXIF orientation tag and
    // the browser rotates the bitmap upright via 'from-image'. For HEIC,
    // workingBlob is the heic2any output which has no metadata, so the
    // browser cannot rotate; we apply the manual transform below using the
    // orientation we captured from the original HEIC.
    const bitmap = await createImageBitmap(workingBlob, {
      imageOrientation: 'from-image',
    });

    const needsManualRotation = isHeic && heicOrientation !== 1;
    const swapAxes =
      needsManualRotation && heicOrientation >= 5 && heicOrientation <= 8;

    let displayedWidth = swapAxes ? bitmap.height : bitmap.width;
    let displayedHeight = swapAxes ? bitmap.width : bitmap.height;

    if (displayedWidth > MAX_DIMENSION || displayedHeight > MAX_DIMENSION) {
      const scale = MAX_DIMENSION / Math.max(displayedWidth, displayedHeight);
      displayedWidth = Math.round(displayedWidth * scale);
      displayedHeight = Math.round(displayedHeight * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    if (needsManualRotation) {
      applyOrientationTransform(
        ctx,
        heicOrientation,
        displayedWidth,
        displayedHeight,
      );
      // After the transform, drawImage's coordinate space is the bitmap's
      // pre-rotation orientation. For axis-swap orientations the canvas
      // dimensions are swapped relative to the source pixels.
      const drawWidth = swapAxes ? displayedHeight : displayedWidth;
      const drawHeight = swapAxes ? displayedWidth : displayedHeight;
      ctx.drawImage(bitmap, 0, 0, drawWidth, drawHeight);
    } else {
      ctx.drawImage(bitmap, 0, 0, displayedWidth, displayedHeight);
    }
    bitmap.close();

    let outDataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

    let exifObj: ExifObject | null = originalExifObj;
    if (!exifObj && preservedExif) {
      exifObj = buildExifObjFromExifr(preservedExif);
    }
    if (exifObj) {
      if (!exifObj['0th']) exifObj['0th'] = {};
      (exifObj['0th'] as Record<number, unknown>)[piexif.ImageIFD.Orientation] = 1;
      if (exifObj.thumbnail) exifObj.thumbnail = null;
      try {
        const exifBytes = piexif.dump(exifObj);
        outDataUrl = piexif.insert(exifBytes, outDataUrl);
      } catch {
        // exif injection failed — keep jpeg without exif
      }
    }

    const outBlob = await dataUrlToBlob(outDataUrl);
    return new File([outBlob], outName.replace(/\.png$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}

/**
 * Set the canvas 2D context transform so subsequent drawImage(0, 0, w, h)
 * places the source bitmap into the canvas in upright (Orientation 1) form.
 * `width` and `height` are the canvas dimensions (post-rotation, displayed).
 */
function applyOrientationTransform(
  ctx: CanvasRenderingContext2D,
  orientation: Orientation,
  width: number,
  height: number,
): void {
  switch (orientation) {
    case 1:
      break;
    case 2:
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
      break;
    case 3:
      ctx.translate(width, height);
      ctx.rotate(Math.PI);
      break;
    case 4:
      ctx.translate(0, height);
      ctx.scale(1, -1);
      break;
    case 5:
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(0, -width);
      break;
    case 7:
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(height, -width);
      ctx.scale(-1, 1);
      break;
    case 8:
      ctx.rotate(-0.5 * Math.PI);
      ctx.translate(-height, 0);
      break;
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error);
    fr.onload = () => resolve(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

function buildExifObjFromExifr(parsed: Record<string, unknown>): ExifObject {
  const obj: ExifObject = { '0th': {}, Exif: {}, GPS: {} };
  const zeroth = obj['0th'] as Record<number, unknown>;
  const exif = obj.Exif as Record<number, unknown>;
  const gps = obj.GPS as Record<number, unknown>;

  if (typeof parsed.Make === 'string') zeroth[piexif.ImageIFD.Make] = parsed.Make;
  if (typeof parsed.Model === 'string') zeroth[piexif.ImageIFD.Model] = parsed.Model;

  const dateRaw = parsed.DateTimeOriginal ?? parsed.CreateDate ?? parsed.DateTime;
  if (dateRaw) {
    const formatted = formatExifDate(dateRaw as Date | string);
    if (formatted) {
      exif[piexif.ExifIFD.DateTimeOriginal] = formatted;
      zeroth[piexif.ImageIFD.DateTime] = formatted;
    }
  }

  const lat = parsed.latitude;
  const lon = parsed.longitude;
  if (typeof lat === 'number' && typeof lon === 'number' && Number.isFinite(lat) && Number.isFinite(lon)) {
    gps[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? 'N' : 'S';
    gps[piexif.GPSIFD.GPSLatitude] = toDms(Math.abs(lat));
    gps[piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? 'E' : 'W';
    gps[piexif.GPSIFD.GPSLongitude] = toDms(Math.abs(lon));
  }
  return obj;
}

function formatExifDate(d: Date | string): string | null {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${dt.getFullYear()}:${pad(dt.getMonth() + 1)}:${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

function toDms(deg: number): [[number, number], [number, number], [number, number]] {
  const d = Math.floor(deg);
  const minFloat = (deg - d) * 60;
  const m = Math.floor(minFloat);
  const s = Math.round((minFloat - m) * 60 * 10000);
  return [
    [d, 1],
    [m, 1],
    [s, 10000],
  ];
}
