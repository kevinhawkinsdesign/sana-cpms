import React from 'react';
import { Download, Printer, Eye } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface TableActionsProps {
  onView: () => void;
  report: {
    operatorName: string;
    chargerName: string;
    timeIn: string;
    timeOut: string | null;
    shiftDuration: number | null;
    attendanceStatus: string;
    shiftStatus: string;
    imageIn: string;
    imageOut: string | null;
    commentIn: string;
    commentOut: string | null;
  };
}

const TableActions: React.FC<TableActionsProps> = ({ onView, report }) => {
  const handleDownload = async () => {
    const doc = new jsPDF();
    
    // Add report header
    doc.setFontSize(20);
    doc.text('Shift Report', 105, 15, { align: 'center' });
    
    // Add operator details
    doc.setFontSize(12);
    doc.text(`Operator: ${report.operatorName}`, 20, 30);
    doc.text(`Station: ${report.chargerName}`, 20, 40);
    doc.text(`Check-in: ${new Date(report.timeIn).toLocaleString()}`, 20, 50);
    if (report.timeOut) {
      doc.text(`Check-out: ${new Date(report.timeOut).toLocaleString()}`, 20, 60);
    }
    doc.text(`Status: ${report.shiftStatus}`, 20, 70);
    doc.text(`Attendance: ${report.attendanceStatus}`, 20, 80);
    
    if (report.shiftDuration) {
      const hours = Math.floor(report.shiftDuration / 60);
      const minutes = report.shiftDuration % 60;
      doc.text(`Duration: ${hours}h ${minutes}m`, 20, 90);
    }

    // Add comments if they exist
    let yPosition = 100;
    if (report.commentIn) {
      doc.text('Check-in Comment:', 20, yPosition);
      doc.setFontSize(10);
      doc.text(report.commentIn, 20, yPosition + 10);
      yPosition += 30;
      doc.setFontSize(12);
    }
    
    if (report.commentOut) {
      doc.text('Check-out Comment:', 20, yPosition);
      doc.setFontSize(10);
      doc.text(report.commentOut, 20, yPosition + 10);
      doc.setFontSize(12);
    }

    // Save the PDF
    doc.save(`shift-report-${report.operatorName}-${new Date(report.timeIn).toISOString().split('T')[0]}.pdf`);
  };

  const handlePrint = () => {
    const printContent = `
      <div style="padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 20px;">Shift Report</h1>
        <div style="margin-bottom: 20px;">
          <p><strong>Operator:</strong> ${report.operatorName}</p>
          <p><strong>Station:</strong> ${report.chargerName}</p>
          <p><strong>Check-in:</strong> ${new Date(report.timeIn).toLocaleString()}</p>
          ${report.timeOut ? `<p><strong>Check-out:</strong> ${new Date(report.timeOut).toLocaleString()}</p>` : ''}
          <p><strong>Status:</strong> ${report.shiftStatus}</p>
          <p><strong>Attendance:</strong> ${report.attendanceStatus}</p>
          ${report.shiftDuration ? `<p><strong>Duration:</strong> ${Math.floor(report.shiftDuration / 60)}h ${report.shiftDuration % 60}m</p>` : ''}
        </div>
        ${report.commentIn ? `
          <div style="margin-bottom: 15px;">
            <h3>Check-in Comment:</h3>
            <p>${report.commentIn}</p>
          </div>
        ` : ''}
        ${report.commentOut ? `
          <div style="margin-bottom: 15px;">
            <h3>Check-out Comment:</h3>
            <p>${report.commentOut}</p>
          </div>
        ` : ''}
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Shift Report - ${report.operatorName}</title>
            <style>
              body { font-family: Arial, sans-serif; }
              h1 { color: #333; }
              p { margin: 8px 0; }
              strong { color: #555; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.onafterprint = function() {
                  window.close();
                }
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="bg-white hover:bg-blue-50"
        onClick={onView}
      >
        <Eye className="h-4 w-4 mr-1" />
        Open
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-white hover:bg-green-50"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4 mr-1" />
        Download
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="bg-white hover:bg-purple-50"
        onClick={handlePrint}
      >
        <Printer className="h-4 w-4 mr-1" />
        Print
      </Button>
    </div>
  );
};

export default TableActions; 