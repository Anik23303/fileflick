/**
 * FileFlick Core Engine
 * Supports: Images (Canvas) + Documents (DOCX → PDF)
 * 100% Local - No data ever leaves the browser.
 */
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------- IMAGE CONVERTER ----------
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

// ---------- DOCX TO PDF CONVERTER (FIXED) ----------
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
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const margin = 50;
        
        // 5. Split text into lines (handles \n, \r\n, and \r)
        const lines = text.split(/\r?\n/);
        
        let currentPage = pdfDoc.addPage([600, 800]);
        let y = currentPage.getHeight() - margin;
        const maxWidth = currentPage.getWidth() - margin * 2;

        // 6. Draw each line
        for (const rawLine of lines) {
          // Skip empty lines (just add a blank line)
          if (rawLine.trim() === '') {
            y -= fontSize * 1.5;
            continue;
          }

          // Word wrap for long lines
          const words = rawLine.split(' ');
          let currentLine = '';

          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const width = font.widthOfTextAtSize(testLine, fontSize);
            
            if (width > maxWidth && currentLine.length > 0) {
              // Draw the current line
              currentPage.drawText(currentLine.trim(), {
                x: margin,
                y: y,
                size: fontSize,
                font: font,
                color: rgb(0, 0, 0),
              });
              y -= fontSize * 1.5;
              currentLine = word + ' ';
              
              // If we run out of space, add a new page
              if (y < margin) {
                currentPage = pdfDoc.addPage([600, 800]);
                y = currentPage.getHeight() - margin;
              }
            } else {
              currentLine = testLine;
            }
          }

          // Draw the last line
          if (currentLine.trim().length > 0) {
            currentPage.drawText(currentLine.trim(), {
              x: margin,
              y: y,
              size: fontSize,
              font: font,
              color: rgb(0, 0, 0),
            });
            y -= fontSize * 1.5;
          }

          // Add extra space after each paragraph
          y -= fontSize * 0.5;

          // If we run out of space, add a new page
          if (y < margin) {
            currentPage = pdfDoc.addPage([600, 800]);
            y = currentPage.getHeight() - margin;
          }
        }

        // 7. Save the PDF
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
