'use client';

import React, { useState, useCallback } from 'react';
import { jsPDF } from "jspdf";
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import { toast } from 'sonner';
import { FaDownload, FaSpinner } from 'react-icons/fa';

import api from '@/lib/api/api';

// Static assets - replace with your actual Next.js imports
import logo from '@/public/Kabisa Logo Y TM.png';
import phoneIcon from '@/public/phone_yellow.png';

// Function to convert centimeters to points
const cmToPt = (cm: number) => cm * 28.3465;

// ALL VARIABLES
const MARGIN = cmToPt(0.5);
const CARD_WIDTH = cmToPt(1.7);
const CARD_HEIGHT = cmToPt(2.38);
const CARD_SPACING = cmToPt(0.2);
const CORNER_RADIUS = cmToPt(0.2);

const LOGO_WIDTH = cmToPt(1.5);
const LOGO_HEIGHT = cmToPt(0.3);
const LOGO_TOP_MARGIN = cmToPt(0.1);

const QR_SIZE = cmToPt(1.05);
const QR_PADDING = cmToPt(0.025);
const QR_TOTAL_SIZE = QR_SIZE + (2 * QR_PADDING)
const QR_TOP_MARGIN = cmToPt(0.7);
const QR_RESOLUTION_FACTOR = 10;

const SERIAL_FONT_SIZE = 14;
const SERIAL_TOP_MARGIN = cmToPt(0.61);

const ASSISTANCE_FONT_SIZE = 10;
const ASSISTANCE_BOTTOM_MARGIN = cmToPt(0.42);

const PHONE_ICON_SIZE = cmToPt(0.3);
const PHONE_ICON_MARGIN = cmToPt(0.05);
const PHONE_SECTION_HEIGHT = cmToPt(0.4);
const PHONE_SECTION_BOTTOM_MARGIN = cmToPt(0.01);
const PHONE_FONT_SIZE = 26;

const TEXT_COLOR = "#FFC300";
const BACKGROUND_COLOR = "#003566";
const CARD_BORDER_COLOR = 'black';

interface PDFItem {
    serialNumber: string;
    qrCodeUrl: string;
}

interface PDFGeneratorProps {
    items: PDFItem[];
    onSaveComplete: () => void;
}

const generateQRCode = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        try {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);
            
            const root = createRoot(container);
            root.render(
                <QRCodeSVG 
                    value={url} 
                    size={QR_SIZE * QR_RESOLUTION_FACTOR} 
                    level="H"
                    includeMargin={false}
                />
            );
            
            setTimeout(() => {
                try {
                    const svg = container.querySelector('svg');
                    if (!svg) {
                        throw new Error('SVG not found');
                    }

                    // Get SVG string and clean it
                    let svgString = new XMLSerializer().serializeToString(svg);
                    
                    // Ensure SVG has proper XML declaration and encoding
                    if (!svgString.includes('<?xml')) {
                        svgString = '<?xml version="1.0" encoding="UTF-8"?>' + svgString;
                    }
                    
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }

                    // Create image element using createElement to avoid Next.js Image conflicts
                    const imgElement = document.createElement('img');
                    
                    const cleanup = () => {
                        try {
                            root.unmount();
                            if (container.parentNode) {
                                document.body.removeChild(container);
                            }
                        } catch (e) {
                            // Ignore cleanup errors
                        }
                    };
                    
                    imgElement.onerror = () => {
                        cleanup();
                        reject(new Error('Failed to load QR code image'));
                    };
                    
                    imgElement.onload = () => {
                        try {
                            const totalSize = QR_TOTAL_SIZE * QR_RESOLUTION_FACTOR;
                            const padding = QR_PADDING * QR_RESOLUTION_FACTOR;
                            canvas.width = totalSize;
                            canvas.height = totalSize;
                            
                            ctx.fillStyle = 'white';
                            ctx.fillRect(0, 0, totalSize, totalSize);
                            ctx.drawImage(imgElement, padding, padding);
                            
                            const dataUrl = canvas.toDataURL('image/png');
                            cleanup();
                            resolve(dataUrl);
                        } catch (error) {
                            cleanup();
                            reject(error);
                        }
                    };

                    try {
                        // Encode SVG properly for data URL
                        const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
                        imgElement.src = `data:image/svg+xml;base64,${svgBase64}`;
                    } catch (error) {
                        cleanup();
                        reject(new Error('Failed to encode SVG'));
                    }
                } catch (error) {
                    cleanup();
                    reject(error);
                }
            }, 150);
        } catch (error) {
            reject(error);
        }
    });
};

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ items, onSaveComplete }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(0);

    const generatePDF = useCallback(async () => {
        try {
            setStep(2);
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
    
            let currentX = MARGIN;
            let currentY = MARGIN;
            const batchSize = 1;
    
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const qrCodes = await Promise.all(batch.map(item => generateQRCode(item.qrCodeUrl)));
    
                for (let j = 0; j < batch.length; j++) {
                    const item = batch[j];
    
                    if (currentX + CARD_WIDTH > pageWidth - MARGIN) {
                        currentX = MARGIN;
                        currentY += CARD_HEIGHT + CARD_SPACING;
                    }
    
                    if (currentY + CARD_HEIGHT > pageHeight - MARGIN) {
                        doc.addPage();
                        currentX = MARGIN;
                        currentY = MARGIN;
                    }
    
                    // Draw card background
                    doc.setFillColor(BACKGROUND_COLOR);
                    doc.setDrawColor(CARD_BORDER_COLOR);
                    doc.roundedRect(currentX, currentY, CARD_WIDTH, CARD_HEIGHT, CORNER_RADIUS, CORNER_RADIUS, 'FD');
    
                    // Add logo - using .src for Next.js static imports
                    doc.addImage(logo.src, 'PNG', currentX + (CARD_WIDTH - LOGO_WIDTH) / 2, currentY + LOGO_TOP_MARGIN, LOGO_WIDTH, LOGO_HEIGHT);
    
                    // Add serial number
                    doc.setTextColor(TEXT_COLOR);
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(SERIAL_FONT_SIZE);
                    doc.text(`${item.serialNumber.slice(0, 4)} ${item.serialNumber.slice(4)}`, currentX + CARD_WIDTH / 2, currentY + SERIAL_TOP_MARGIN, { align: 'center' });
    
                    // Add QR code - strip data URL prefix for jsPDF
                    const qrCodeData = qrCodes[j].replace(/^data:image\/png;base64,/, '');
                    doc.addImage(
                        qrCodeData,
                        'PNG',
                        currentX + (CARD_WIDTH - QR_TOTAL_SIZE) / 2,
                        currentY + QR_TOP_MARGIN,
                        QR_TOTAL_SIZE,
                        QR_TOTAL_SIZE
                    );
                

    
                    // Add "For assistance call" text
                    doc.setFontSize(ASSISTANCE_FONT_SIZE);
                    doc.text("For assistance call", currentX + CARD_WIDTH / 2, currentY + CARD_HEIGHT - ASSISTANCE_BOTTOM_MARGIN, { align: 'center' });
    
                    // Add phone icon and number
                    const phoneSectionY = currentY + CARD_HEIGHT - PHONE_SECTION_BOTTOM_MARGIN - PHONE_SECTION_HEIGHT;
                    const phoneIconY = phoneSectionY + (PHONE_SECTION_HEIGHT - PHONE_ICON_SIZE) / 2;
                    const phoneTextY = phoneSectionY + PHONE_SECTION_HEIGHT / 2;
    
                    // Set font size for measurement
                    doc.setFontSize(PHONE_FONT_SIZE);
                    const phoneNumberWidth = doc.getTextWidth("6420");
    
                    // Calculate total width of icon + margin + number
                    const totalPhoneWidth = PHONE_ICON_SIZE + PHONE_ICON_MARGIN + phoneNumberWidth;
    
                    // Calculate starting X position to center both elements
                    const phoneStartX = currentX + (CARD_WIDTH - totalPhoneWidth) / 2;
    
                    // Add phone icon - using .src for Next.js static imports
                    doc.addImage(
                        phoneIcon.src,
                        'PNG',
                        phoneStartX,
                        phoneIconY,
                        PHONE_ICON_SIZE,
                        PHONE_ICON_SIZE
                    );
    
                    // Add phone number
                    doc.text(
                        "6420",
                        phoneStartX + PHONE_ICON_SIZE + PHONE_ICON_MARGIN,
                        phoneTextY,
                        { align: 'left', baseline: 'middle' }
                    );
    
                    currentX += CARD_WIDTH + CARD_SPACING;
                }
            }
    
            // Save the PDF document
            doc.save('cards.pdf');
        }
        catch (error: any) { 
            toast.error(`Download FAILED: ${error.message}`);
        }
    }, [items]);

    const saveToAirtable = async () => {
        try {
            setIsLoading(true);
            setStep(1);
            await api().post('/api/serial-numbers', { serialNumbers: items.map(r => r.serialNumber) });
            await generatePDF()
            onSaveComplete();
        }
        catch (_: any) { }
        finally { setIsLoading(false); setStep(0); }
    };

    return (
        <div className="flex justify-center items-center p-4">
            <button
                onClick={saveToAirtable}
                disabled={isLoading}
                className={`
                        flex items-center justify-center
                        px-6 py-3 text-lg font-semibold text-white
                        rounded-lg shadow-md transition-all duration-300 ease-in-out
                        ${isLoading
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                    }
                    `}
            >
                {isLoading ? (
                    <div className="flex items-center space-x-2">
                        <FaSpinner className="animate-spin" size={24} />
                        <span>
                            {step === 1 ? "Saving Serial Numbers..." :
                                step === 2 ? "Downloading PDF..." :
                                    "Exporting..."}
                        </span>
                    </div>
                ) : (
                    <div className="flex items-center space-x-2">
                        <FaDownload size={24} />
                        <span>Export & Download</span>
                    </div>
                )}
            </button>
        </div>
    );
};

export default PDFGenerator;