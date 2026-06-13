import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface GeneratePDFOptions {
  invoiceNumber: string;
  clientName: string;
  currency: string;
}

async function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      })
      .catch(reject);
  });
}

export async function generateInvoicePDF(options: GeneratePDFOptions): Promise<void> {
  const { invoiceNumber, clientName, currency } = options;

  const invoiceElement = document.getElementById('invoice-preview');
  if (!invoiceElement) {
    throw new Error('Invoice preview element not found');
  }

  // Convert all images to base64
  const images = invoiceElement.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(async (img) => {
      if (img instanceof HTMLImageElement) {
        try {
          let imgUrl = img.src;
          if (!imgUrl.startsWith('http')) {
            imgUrl = `${window.location.origin}${imgUrl}`;
          }
          const base64 = await loadImageAsBase64(imgUrl);
          img.src = base64;
        } catch (error) {
          console.error('Failed to load image:', img.src, error);
        }
      }
    })
  );

  // Use html2canvas to capture the invoice as an image
  const canvas = await html2canvas(invoiceElement, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: invoiceElement.scrollWidth,
    windowHeight: invoiceElement.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/png');

  // A4 dimensions in mm
  const pdfWidth = 210;
  const pdfHeight = 297;

  // Calculate dimensions to fit the canvas onto A4
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

  const scaledWidth = imgWidth * ratio;
  const scaledHeight = imgHeight * ratio;

  // Center the image on the page
  const x = (pdfWidth - scaledWidth) / 2;
  const y = 0;

  // Create PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set metadata
  pdf.setProperties({
    title: invoiceNumber,
    subject: `Invoice for ${clientName}`,
    author: 'Shivohini TechAI',
    creator: 'Apna Invoice System',
  });

  // Add image to PDF
  pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

  // Generate filename
  const safeClientName = (clientName || 'user').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const filename = `${invoiceNumber}-${safeClientName}-${currency}.pdf`;

  // Download
  pdf.save(filename);
}
