/**
 * FileFlick Core Engine
 * Supports: Images (Canvas) + Documents (DOCX → PDF)
 * 100% Local - No data ever leaves the browser.
 */
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------- IMAGE CONVERTER (Existing) ----------
export const convertImage = (file, targetFormat) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Please upload a valid image file.'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        let mimeType = `image/${targetFormat}`;
        if (targetFormat === 'jpeg' || targetFormat === 'jpg') mimeType = 'image/jpeg';

        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Conversion failed.'));
          const url = URL.createObjectURL(blob);
          resolve({ url, blob, name: `converted.${targetFormat}` });
        }, mimeType, 0.92);
      };
      img.onerror = () => reject(new Error('Failed to load the image.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsDataURL(file);
  });
};

// ---------- NEW: DOCX TO PDF CONVERTER ----------
export const convertDocxToPdf = (file) => {
  return new Promise((resolve, reject) => {
    // 1. Check if it's a Word file
    if (!file.name.endsWith('.docx') && !file.type.includes('word')) {
      return reject(new Error('Please upload a valid .docx file.'));
    }

    // 2. Read the file as an ArrayBuffer (binary data)
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;

        // 3. Extract text from DOCX using Mammoth
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        if (!text.trim()) {
          return reject(new Error('No text found in the Word document.'));
        }

        // 4. Create a new PDF using pdf-lib
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([600, 800]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;

        // 5. Draw the text onto the PDF
        const margin = 50;
        const maxWidth = page.getWidth() - margin * 2;
        let y = page.getHeight() - margin;

        const words = text.split(' ');
        let line = '';

        for (const word of words) {
          const testLine = line + word + ' ';
          const width = font.widthOfTextAtSize(testLine, fontSize);
          
          if (width > maxWidth && line.length > 0) {
            page.drawText(line.trim(), {
              x: margin,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            y -= fontSize * 1.5;
            line = word + ' ';
            
            if (y < margin) {
              const newPage = pdfDoc.addPage([600, 800]);
              y = newPage.getHeight() - margin;
            }
          } else {
            line = testLine;
          }
        }

        if (line.trim().length > 0) {
          page.drawText(line.trim(), {
            x: margin,
            y: y,
            size: fontSize,
            font: font,
            color: rgb(0, 0, 0),
          });
        }

        // 6. Save the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        resolve({ url, blob, name: 'converted.pdf' });

      } catch (error) {
        reject(new Error('Failed to convert DOCX to PDF: ' + error.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read the file.'));
    reader.readAsArrayBuffer(file);
  });
};
