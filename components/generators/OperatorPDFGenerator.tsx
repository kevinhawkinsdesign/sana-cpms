'use client';

import { jsPDF } from 'jspdf';
import { QRCodeSVG } from 'qrcode.react';
import { createRoot } from 'react-dom/client';
import logo from '@/public/Kabisa Logo Y TM.png';
import { Operator } from '@/types/operator';

interface WifiConfig {
  ssid: string;
  password: string;
  encryptionType: string;
}

interface OperatorConfig {
  baseUrl: string;
}

const CM_TO_POINT = 28.3465;
const QR_RESOLUTION_FACTOR = 10;

// A4 Landscape dimensions
const PAGE = {
  WIDTH: 29.7 * CM_TO_POINT,
  HEIGHT: 21 * CM_TO_POINT,
  MARGIN_X: 2 * CM_TO_POINT,
  MARGIN_Y: 1.5 * CM_TO_POINT,
};

const CARD = {
  WIDTH: 12 * CM_TO_POINT,
  HEIGHT: 8 * CM_TO_POINT,
  PADDING: 0.4 * CM_TO_POINT,
  GAP_X: 1 * CM_TO_POINT,
  GAP_Y: 1 * CM_TO_POINT,
  BORDER_RADIUS: 0.3 * CM_TO_POINT,
};

const LOGO = {
  WIDTH: 5 * CM_TO_POINT,
  HEIGHT: 1.2 * CM_TO_POINT,
  TOP_MARGIN: 0.5 * CM_TO_POINT,
};

const QR = {
  SIZE: 2.8 * CM_TO_POINT,
  PADDING: 0.15 * CM_TO_POINT,
  TOP_MARGIN: 3 * CM_TO_POINT,
};

const PHOTO = {
  SIZE: 2.8 * CM_TO_POINT,
  TOP_MARGIN: 3 * CM_TO_POINT,
};

const TEXT = {
  NAME_SIZE: 16,
  ID_SIZE: 14,
  WIFI_TEXT_SIZE: 10,
  TITLE_COLOR: '#002B5C',
  SUBTITLE_COLOR: '#666666',
};

const DEFAULT_WIFI_CONFIG: WifiConfig = {
  ssid: 'KabisaSupercharger',
  password: 'superfastcharger',
  encryptionType: 'WPA',
};

const DEFAULT_OPERATOR_CONFIG: OperatorConfig = {
  baseUrl: 'https://gokabisa.com/charge/operator',
};

class OperatorPDFGenerator {
  private static generateWifiString(config: WifiConfig): string {
    return `WIFI:S:${config.ssid};T:${config.encryptionType};P:${config.password};;`;
  }

  static async generateQRCode(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        document.body.appendChild(container);

        const root = createRoot(container);
        root.render(
          <QRCodeSVG
            value={url}
            size={QR.SIZE * QR_RESOLUTION_FACTOR}
            level="H"
            includeMargin={true}
            bgColor="transparent"
            fgColor="black"
          />
        );

        setTimeout(() => {
          try {
            const svg = container.querySelector('svg');
            if (!svg) {
              throw new Error('SVG not found');
            }

            const svgData = new XMLSerializer().serializeToString(svg);
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              throw new Error('Could not get canvas context');
            }

            const img = document.createElement('img');
            
            const cleanup = () => {
              try {
                root.unmount();
                if (container.parentNode) {
                  document.body.removeChild(container);
                }
              } catch (e) {
                console.warn('Cleanup error:', e);
              }
            };

            img.onload = () => {
              try {
                canvas.width = QR.SIZE * QR_RESOLUTION_FACTOR;
                canvas.height = QR.SIZE * QR_RESOLUTION_FACTOR;

                // Fill white background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL('image/png', 1.0);
                cleanup();
                resolve(dataUrl);
              } catch (error) {
                cleanup();
                reject(new Error(`Canvas processing failed: ${error}`));
              }
            };

            img.onerror = () => {
              cleanup();
              reject(new Error('Failed to load SVG as image'));
            };

            // Create blob URL for better browser compatibility
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            img.src = url;

            // Clean up blob URL after use
            img.onload = ((originalOnLoad) => function(e) {
              URL.revokeObjectURL(url);
              return originalOnLoad.call(this, e);
            })(img.onload);

          } catch (error) {
            cleanup();
            reject(new Error(`QR generation failed: ${error}`));
          }
        }, 200);
      } catch (error) {
        reject(new Error(`QR code generation failed: ${error}`));
      }
    });
  }

  static async generateCard(
    doc: jsPDF,
    operator: Operator,
    x: number,
    y: number,
    isFront: boolean,
    wifiConfig: WifiConfig,
    operatorConfig: OperatorConfig,
  ): Promise<void> {
    // Card with rounded corners and gray border
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, CARD.WIDTH, CARD.HEIGHT, CARD.BORDER_RADIUS, CARD.BORDER_RADIUS, 'FD');

    if (isFront) {
      // Logo - using .src for Next.js static imports
      if (logo?.src) {
        doc.addImage(
          logo.src,
          'PNG',
          x + (CARD.WIDTH - LOGO.WIDTH) / 2,
          y + LOGO.TOP_MARGIN,
          LOGO.WIDTH,
          LOGO.HEIGHT
        );
      }

      // Add name
      doc.setFontSize(TEXT.NAME_SIZE);
      doc.setTextColor(TEXT.TITLE_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(
        operator.Name || 'Unknown Operator',
        x + CARD.WIDTH / 2,
        y + LOGO.TOP_MARGIN + LOGO.HEIGHT + 20,
        { align: 'center' }
      );

      const centerX = x + CARD.WIDTH / 2;
      const qrX = centerX - QR.SIZE - CARD.PADDING;
      const photoX = centerX + CARD.PADDING;

      // WiFi QR code
      try {
        const wifiQR = await this.generateQRCode(this.generateWifiString(wifiConfig));
        // Remove data URL prefix for jsPDF
        const qrData = wifiQR.replace(/^data:image\/png;base64,/, '');
        doc.addImage(
          qrData,
          'PNG',
          qrX,
          y + QR.TOP_MARGIN,
          QR.SIZE,
          QR.SIZE
        );
      } catch (error) {
        console.error('Failed to generate WiFi QR code:', error);
      }

      // Photo
      if (operator.Headshot?.[0]) {
        try {
          doc.addImage(
            operator.Headshot[0],
            'JPEG',
            photoX,
            y + PHOTO.TOP_MARGIN,
            PHOTO.SIZE,
            PHOTO.SIZE
          );
        } catch (error) {
          console.error('Failed to add operator photo:', error);
        }
      }

      // WiFi text
      doc.setFontSize(TEXT.WIFI_TEXT_SIZE);
      doc.setTextColor(TEXT.SUBTITLE_COLOR);
      doc.setFont('helvetica', 'normal');
      doc.text(
        'Scan for Free Wifi',
        qrX + QR.SIZE / 2,
        y + QR.TOP_MARGIN + QR.SIZE + 15,
        { align: 'center' }
      );
    } else {
      // Back side
      doc.setFontSize(TEXT.ID_SIZE);
      doc.setTextColor(TEXT.TITLE_COLOR);
      doc.setFont('helvetica', 'bold');
      doc.text(
        `Operator ID: ${operator.KabisaID || 'N/A'}`,
        x + CARD.WIDTH / 2,
        y + CARD.PADDING + 25,
        { align: 'center' }
      );

      // Operator QR code
      if (operator.KabisaID) {
        try {
          const operatorQR = await this.generateQRCode(
            `${operatorConfig.baseUrl}/${operator.KabisaID}`
          );
          // Remove data URL prefix for jsPDF
          const qrData = operatorQR.replace(/^data:image\/png;base64,/, '');
          doc.addImage(
            qrData,
            'PNG',
            x + (CARD.WIDTH - QR.SIZE) / 2,
            y + (CARD.HEIGHT - QR.SIZE) / 2,
            QR.SIZE,
            QR.SIZE
          );
        } catch (error) {
          console.error('Failed to generate operator QR code:', error);
        }
      }
    }
  }

  static async generate(
    operators: Operator[],
    wifiConfig: WifiConfig = DEFAULT_WIFI_CONFIG,
    operatorConfig: OperatorConfig = DEFAULT_OPERATOR_CONFIG,
  ): Promise<void> {
    if (!operators || operators.length === 0) {
      throw new Error('No operators provided for badge generation');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
    });

    try {
      for (let i = 0; i < operators.length; i++) {
        if (i > 0) {
          doc.addPage();
        }

        // Front of Card
        await this.generateCard(
          doc,
          operators[i],
          PAGE.MARGIN_X,
          PAGE.MARGIN_Y,
          true,
          wifiConfig,
          operatorConfig
        );

        // Back of Card
        await this.generateCard(
          doc,
          operators[i],
          PAGE.MARGIN_X + CARD.WIDTH + CARD.GAP_X,
          PAGE.MARGIN_Y,
          false,
          wifiConfig,
          operatorConfig
        );
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `operator-badges-${timestamp}.pdf`;
      doc.save(filename);
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export default OperatorPDFGenerator;