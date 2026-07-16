'use client';

import { QRCodeSVG } from 'qrcode.react';
import { Operator } from '@/types/index';
import logo from '@/public/Kabisa Logo Y TM.png';
import Image from 'next/image';

interface PreviewBadgeProps {
  operator: Operator;
}

export const PreviewBadge = ({ operator }: PreviewBadgeProps) => {
  const wifiString = "WIFI:S:KabisaSupercharger;T:WPA;P:superfastcharger;;";
  const operatorUrl = `https://gokabisa.com/charge/operator/${operator.KabisaID || 'preview'}`;

  return (
    <div className="space-y-4">
      {/* Front Side */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 w-[250px] mx-auto relative shadow-sm hover:shadow-md transition-shadow">
        {/* Logo Section */}
        <div className="mb-4 flex justify-center">
          {logo?.src ? (
            <Image
              src={logo.src}
              alt="Kabisa Logo"
              width={120}
              height={30}
              className="object-contain"
              priority
            />
          ) : (
            <div className="text-[#FDB813] text-2xl font-bold tracking-widest">
              KABISA
            </div>
          )}
        </div>
        
        {/* Operator Name */}
        <div className="text-center mb-4">
          <p className="text-[#002B5C] font-semibold text-lg truncate" title={operator.Name}>
            {operator.Name || 'Unknown Operator'}
          </p>
        </div>
        
        {/* QR Code and Photo Section */}
        <div className="flex gap-4 justify-between items-start px-2">
          {/* WiFi QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-2 border border-gray-100 rounded">
              <QRCodeSVG 
                value={wifiString}
                size={80}
                level="H"
                includeMargin={false}
                bgColor="transparent"
                fgColor="#000000"
              />
            </div>
            <p className="text-xs text-[#002B5C] font-semibold mt-1 text-center">
              Scan for Free Wifi
            </p>
          </div>
          
          {/* Operator Photo */}
          <div className="flex-shrink-0">
            {operator.Headshot?.[0] ? (
              <div className="relative w-[80px] h-[80px] rounded overflow-hidden bg-gray-100">
                <Image 
                  src={operator.Headshot[0]}
                  alt={`${operator.Name} headshot`}
                  fill
                  sizes="80px"
                  className="object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = `
                        <div class="w-[80px] h-[80px] bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-semibold rounded">
                          ${operator.Name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </div>
                      `;
                    }
                  }}
                />
              </div>
            ) : (
              <div className="w-[80px] h-[80px] bg-gray-300 flex items-center justify-center text-gray-600 text-lg font-semibold rounded">
                {operator.Name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Back Side */}
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 w-[250px] mx-auto shadow-sm hover:shadow-md transition-shadow">
        {/* Operator ID Header */}
        <div className="text-center mb-4">
          <p className="text-[#002B5C] text-sm font-semibold">
            Operator ID: {operator.KabisaID || 'To be generated'}
          </p>
        </div>
        
        {/* Operator QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-2 border border-gray-100 rounded">
            <QRCodeSVG 
              value={operatorUrl}
              size={100}
              level="H"
              includeMargin={false}
              bgColor="transparent"
              fgColor="#000000"
            />
          </div>
        </div>

        {/* QR Code Description */}
        <div className="text-center mt-2">
          <p className="text-xs text-gray-500">
            Scan to view operator profile
          </p>
        </div>
      </div>

      {/* Preview Label */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
          Preview {operator.KabisaID ? `(ID: ${operator.KabisaID})` : '(ID will be generated)'}
        </div>
      </div>
    </div>
  );
};