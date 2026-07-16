declare module 'piexifjs' {
  type ExifIfd = Record<number, unknown>;
  export interface ExifObject {
    '0th'?: ExifIfd;
    Exif?: ExifIfd;
    GPS?: ExifIfd;
    Interop?: ExifIfd;
    '1st'?: ExifIfd;
    thumbnail?: string | null;
  }

  export const ImageIFD: {
    Orientation: number;
    Make: number;
    Model: number;
    DateTime: number;
    Software: number;
    [k: string]: number;
  };

  export const ExifIFD: {
    DateTimeOriginal: number;
    DateTimeDigitized: number;
    [k: string]: number;
  };

  export const GPSIFD: {
    GPSLatitudeRef: number;
    GPSLatitude: number;
    GPSLongitudeRef: number;
    GPSLongitude: number;
    GPSAltitudeRef: number;
    GPSAltitude: number;
    [k: string]: number;
  };

  export function load(jpegDataUrl: string): ExifObject;
  export function dump(exifObj: ExifObject): string;
  export function insert(exifBytes: string, jpegDataUrl: string): string;
  export function remove(jpegDataUrl: string): string;

  const _default: {
    ImageIFD: typeof ImageIFD;
    ExifIFD: typeof ExifIFD;
    GPSIFD: typeof GPSIFD;
    load: typeof load;
    dump: typeof dump;
    insert: typeof insert;
    remove: typeof remove;
  };
  export default _default;
}
