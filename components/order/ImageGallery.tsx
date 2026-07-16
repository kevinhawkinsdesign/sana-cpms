'use client';

import React from 'react';
import Image from 'next/image';

interface VehicleGalleryProps {
  images: string[];
  make: string;
  model: string;
  year: number;
}

export const VehicleGallery: React.FC<VehicleGalleryProps> = ({
  images,
  make,
  model,
  year
}) => {

  const validImages = images.filter(img => !!img);

  if (validImages.length === 0) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-100">
        <p className="text-gray-500">No images available</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full bg-gray-50">
          <Image
            src={validImages[0]}
            alt={`${year} ${make} ${model}`}
            fill
            className="object-contain object-center"
            priority={true}
            quality={85}
            sizes="(max-width: 768px) 100vw, 60vw"
          />
        </div>
      </div>
    </div>
  );
};

export default VehicleGallery;