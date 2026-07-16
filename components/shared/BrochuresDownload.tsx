'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';

const BrochuresDownload = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const brochures = [
    {
      name: 'Vehicle Brochure',
      url: '/docs/kabisa-vehicle-brochure.pdf',
      filename: 'Kabisa Vehicle Brochure.pdf',
      description: 'Learn about our comprehensive vehicle specifications, features, and performance details.'
    },
    {
      name: 'Charging Brochure',
      url: '/docs/kabisa-charger-brochure.pdf',
      filename: 'Kabisa EV Charging Brochure.pdf',
      description: 'Discover our charging solutions, infrastructure details, and network coverage.'
    }
  ];
  
  const handleDownload = async (url: string, filename: string) => {
    try {
      setLoading(filename);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
   
    } catch (error) {
      console.error('Download failed:', error);
      
      alert('Failed to download the PDF. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-16 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Download Our Brochures
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 px-4">
          {brochures.map((brochure) => (
            <div 
              key={brochure.name}
              className="group bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 
                        overflow-hidden border border-gray-100 hover:border-blue-100"
            >
              <div className="p-8">
                <div className="mb-6 flex justify-center">
                  <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center
                                group-hover:bg-blue-100 transition-colors duration-300">
                    <FileText size={32} className="text-blue-600" />
                  </div>
                </div>

                <h3 className="text-xl font-semibold text-gray-800 mb-3 text-center">
                  {brochure.name}
                </h3>
                <p className="text-gray-600 mb-8 min-h-[60px] text-center">
                  {brochure.description}
                </p>
                <button
                  onClick={() => handleDownload(brochure.url, brochure.filename)}
                  disabled={loading === brochure.filename}
                  className={`w-full flex items-center justify-center gap-3 
                    ${loading === brochure.filename 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100'} 
                    text-white px-6 py-4 rounded-xl transition-all duration-300
                    transform hover:translate-y-[-2px]`}
                >
                  <Download size={22} />
                  <span className="font-medium text-lg">
                    {loading === brochure.filename ? 'Downloading...' : 'Download PDF'}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrochuresDownload;