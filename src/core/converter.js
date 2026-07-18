/**
 * FileFlick Core Engine - Full Multi-Format Converter
 * Supports: Images + DOCX↔PDF + PDF→DOCX/XLSX/PPTX/TXT/HTML
 * 100% Local - No data ever leaves the browser.
 */
import mammoth from 'mammoth';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'; // <<< local worker, no CDN
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

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

// ---------- DOCX TO PDF ----------
export const convertDocxToPdf = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.name.endsWith('.docx') && !file.type.includes('word')) {
      return reject(new Error('Please upload a valid .docx file.'));
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value;

        if (!text.trim()) {
          return reject(new Error('No text found in the Word document.'));
        }

        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 12;
        const margin = 50;
        const lines = text.split(/\r?\n/);
        let currentPage = pdfDoc.addPage([600, 800]);
        let y = currentPage.getHeight() - margin;
        const maxWidth = currentPage.getWidth() - margin * 2;

        for (const rawLine of lines) {
          if (rawLine.trim() === '') {
            y -= fontSize * 1.5;
            continue;
          }
          const words = rawLine.split(' ');
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine + word + ' ';
            const width = font.widthOfTextAtSize(testLine, fontSize);
            if (width > maxWidth && currentLine.length > 0) {
              currentPage.drawText(currentLine.trim(), { x: margin, y: y, size: fontSize, font: font, color: rgb(0, 0, 0) });
              y -= fontSize * 1.5;
              currentLine = word + ' ';
              if (y < margin) { currentPage = pdfDoc.addPage([600, 800]); y = currentPage.getHeight() - margin; }
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine.trim().length > 0) {
            currentPage.drawText(currentLine.trim(), { x: margin, y: y, size: fontSize, font: font, color: rgb(0, 0, 0) });
            y -= fontSize * 1.5;
          }
          y -= fontSize * 0.5;
          if (y < margin) { currentPage = pdfDoc.addPage([600, 800]); y = currentPage.getHeight() - margin; }
        }

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

// ---------- HELPER: Extract text from PDF using local worker ----------
const extractTextFromPdf = async (file) => {
  // Set the worker to our local bundled version (no CDN, works offline)
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

// ---------- PDF TO DOCX ----------
export const convertPdfToDocx = async (file) => {
  try {
    const text = await extractTextFromPdf(file);
    if (!text.trim()) throw new Error('No text found in PDF.');

    const doc = new Document({
      sections: [{
        properties: {},
        children: text.split(/\r?\n/).filter(line => line.trim()).map(line => 
          new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
          })
        ),
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    return { url, blob, name: 'converted.docx' };
  } catch (error) {
    throw new Error('PDF to DOCX failed: ' + error.message);
  }
};

// ---------- PDF TO XLSX ----------
export const convertPdfToXlsx = async (file) => {
  try {
    const text = await extractTextFromPdf(file);
    if (!text.trim()) throw new Error('No text found in PDF.');

    const rows = text.split(/\r?\n/).filter(line => line.trim()).map(line => 
      line.split(/\s{2,}|\t/).map(cell => cell.trim())
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    return { url, blob, name: 'converted.xlsx' };
  } catch (error) {
    throw new Error('PDF to XLSX failed: ' + error.message);
  }
};

// ---------- PDF TO PPTX ----------
export const convertPdfToPptx = async (file) => {
  try {
    const text = await extractTextFromPdf(file);
    if (!text.trim()) throw new Error('No text found in PDF.');

    const pptx = new PptxGenJS();
    const lines = text.split(/\r?\n/).filter(line => line.trim());

    let slide = pptx.addSlide();
    let slideText = '';
    let slideCount = 0;

    for (const line of lines) {
      if (slideText.length + line.length > 800 || slideCount >= 5) {
        slide.addText(slideText, { x: 1, y: 0.5, w: 8, h: 6, fontSize: 18, color: '000000' });
        slide = pptx.addSlide();
        slideText = '';
        slideCount = 0;
      }
      slideText += line + '\n';
      slideCount++;
    }
    if (slideText) {
      slide.addText(slideText, { x: 1, y: 0.5, w: 8, h: 6, fontSize: 18, color: '000000' });
    }

    const blob = await pptx.write({ outputType: 'blob' });
    const url = URL.createObjectURL(blob);
    return { url, blob, name: 'converted.pptx' };
  } catch (error) {
    throw new Error('PDF to PPTX failed: ' + error.message);
  }
};

// ---------- PDF TO TXT ----------
export const convertPdfToTxt = async (file) => {
  try {
    const text = await extractTextFromPdf(file);
    if (!text.trim()) throw new Error('No text found in PDF.');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    return { url, blob, name: 'converted.txt' };
  } catch (error) {
    throw new Error('PDF to TXT failed: ' + error.message);
  }
};

// ---------- PDF TO HTML ----------
export const convertPdfToHtml = async (file) => {
  try {
    const text = await extractTextFromPdf(file);
    if (!text.trim()) throw new Error('No text found in PDF.');
    
    const htmlContent = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Converted PDF</title></head>
<body>
${text.split(/\r?\n/).filter(line => line.trim()).map(line => `<p>${line}</p>`).join('\n')}
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    return { url, blob, name: 'converted.html' };
  } catch (error) {
    throw new Error('PDF to HTML failed: ' + error.message);
  }
};
