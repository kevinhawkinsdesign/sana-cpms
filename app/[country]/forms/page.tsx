'use client'
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeData {
  title: string;
  link: string;
  bgColor: string;
  description: string;
}

const QRCodePage: React.FC = () => {
  const qrCodes: QRCodeData[] = [
    {
      title: 'Contact',
      link: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagyPoM3W9Ps4WozT/form',
      bgColor: 'bg-purple-50',
      description: 'Get in touch with us'
    },
    {
      title: 'Test Drive',
      link: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pag0abXrye6lVh9bx/form',
      bgColor: 'bg-green-50',
      description: 'Schedule your test drive'
    },
    {
      title: 'Financing',
      link: 'https://airtable.com/embed/appcxJlWp5SUD3aUU/pagS6NVCrDHzJNnfD/form',
      bgColor: 'bg-blue-50',
      description: 'Apply for vehicle financing'
    },
   
    {
      title: 'Charger Installation',
      link: 'https://airtable.com/appwFmocJeB0pklLN/pag7tAzHLVQdEali6/form',
      bgColor: 'bg-purple-50',
      description: 'Request EV charger installation'
    },
    {
      title: 'Office Visitor Sign-In',
      link: 'https://airtable.com/appcxJlWp5SUD3aUU/pagBq1fiDrQN30XyU/form',
      bgColor: 'bg-blue-50',
      description: 'Tell us your visit purpose.'
    }
  ];

  const handleTileClick = (link: string) => {
    window.open(link, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-5xl font-bold text-center text-gray-900 mb-8 flex justify-center items-center gap-4">
          <img 
            src="https://gokabisa.com/kabisa.png" 
            alt="Kabisa Logo" 
            className="h-11 w-auto"  
          /> 
          Services
        </h1>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Scan any QR code below to access our services directly from your mobile device
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {qrCodes.map((qr, index) => (
            <motion.div
              key={qr.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleTileClick(qr.link)}
              className="cursor-pointer"
            >
              <Card className="overflow-hidden bg-white border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4">{qr.title}</h2>
                    <div className={`p-4 rounded-xl ${qr.bgColor} hover:bg-opacity-75 transition-all duration-300`}>
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <QRCodeSVG
                          value={qr.link}
                          size={200}
                          level="H"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                    <p className="text-gray-600 mt-4 text-center flex items-center gap-2">
                      {qr.description}
                      {qr.description.includes('Kabisa') && (
                        <img
                          src="https://gokabisa.com/kabisa.png"
                          alt="Kabisa Logo"
                          className="h-10 w-auto"
                        />
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;