import React, { useState } from 'react';
import { 
  convertImage, 
  convertDocxToPdf, 
  convertPdfToDocx, 
  convertPdfToXlsx, 
  convertPdfToPptx, 
  convertPdfToTxt, 
  convertPdfToHtml 
} from './core/converter';

function App() {
  const [file, setFile] = useState(null);
  const [conversionType, setConversionType] = useState('image');
  const [outputFormat, setOutputFormat] = useState('png');
  const [convertedFile, setConvertedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // --- NEW: Progress Bar State ---
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  // --- END NEW ---

  const conversionConfigs = {
    image: {
      label: 'Image Converter',
      formats: ['png', 'jpeg', 'webp', 'bmp'],
      accept: 'image/*',
      defaultFormat: 'png',
      convert: convertImage
    },
    pdfToDocx: {
      label: 'PDF → DOCX (Word)',
      formats: ['docx'],
      accept: '.pdf',
      defaultFormat: 'docx',
      convert: convertPdfToDocx
    },
    pdfToXlsx: {
      label: 'PDF → XLSX (Excel)',
      formats: ['xlsx'],
      accept: '.pdf',
      defaultFormat: 'xlsx',
      convert: convertPdfToXlsx
    },
    pdfToPptx: {
      label: 'PDF → PPTX (PowerPoint)',
      formats: ['pptx'],
      accept: '.pdf',
      defaultFormat: 'pptx',
      convert: convertPdfToPptx
    },
    pdfToTxt: {
      label: 'PDF → TXT',
      formats: ['txt'],
      accept: '.pdf',
      defaultFormat: 'txt',
      convert: convertPdfToTxt
    },
    pdfToHtml: {
      label: 'PDF → HTML',
      formats: ['html'],
      accept: '.pdf',
      defaultFormat: 'html',
      convert: convertPdfToHtml
    },
    docxToPdf: {
      label: 'DOCX → PDF',
      formats: ['pdf'],
      accept: '.docx',
      defaultFormat: 'pdf',
      convert: convertDocxToPdf
    }
  };

  const currentConfig = conversionConfigs[conversionType];

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      setConvertedFile(null);
      setProgress(0);
      setProgressMessage('');
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      setConvertedFile(null);
      setProgress(0);
      setProgressMessage('');
    }
  };

  // --- NEW: Progress Callback (passed to conversion functions) ---
  const handleProgress = (percent, message) => {
    setProgress(percent);
    setProgressMessage(message || '');
  };
  // --- END NEW ---

  // --- Updated Convert Handler (passes onProgress) ---
  const handleConvert = async () => {
    if (!file) return alert('Please upload a file first.');
    setIsLoading(true);
    setProgress(0);
    setProgressMessage('Starting...');
    setConvertedFile(null);
    
    try {
      let result;
      if (conversionType === 'image') {
        result = await convertImage(file, outputFormat, handleProgress);
      } else {
        result = await currentConfig.convert(file, handleProgress);
      }
      setConvertedFile(result);
    } catch (error) {
      alert('Conversion failed: ' + error.message);
      setProgress(0);
      setProgressMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!convertedFile) return;
    const link = document.createElement('a');
    link.href = convertedFile.url;
    link.download = convertedFile.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Reset progress after download
    setProgress(0);
    setProgressMessage('');
  };

  const getFormatDisplay = (format) => {
    const map = {
      png: 'PNG', jpeg: 'JPG', webp: 'WebP', bmp: 'BMP',
      docx: 'DOCX', xlsx: 'XLSX', pptx: 'PPTX', txt: 'TXT',
      html: 'HTML', pdf: 'PDF'
    };
    return map[format] || format.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
            FileFlick
          </h1>
          <p className="text-gray-500 mt-2">Instant · Private · 100% Free</p>
          <p className="text-xs text-gray-400 mt-1">No sign-up required. Files never leave your device.</p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Conversion Type:</label>
          <select 
            value={conversionType} 
            onChange={(e) => {
              setConversionType(e.target.value);
              const config = conversionConfigs[e.target.value];
              setOutputFormat(config.defaultFormat);
              setFile(null);
              setConvertedFile(null);
              setProgress(0);
              setProgressMessage('');
            }}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="image">🖼️ Image Converter (PNG, JPG, WebP, BMP)</option>
            <option value="pdfToDocx">📄 PDF → DOCX (Word)</option>
            <option value="pdfToXlsx">📊 PDF → XLSX (Excel)</option>
            <option value="pdfToPptx">📽️ PDF → PPTX (PowerPoint)</option>
            <option value="pdfToTxt">📝 PDF → TXT</option>
            <option value="pdfToHtml">🌐 PDF → HTML</option>
            <option value="docxToPdf">📄 DOCX → PDF</option>
          </select>
        </div>

        {/* Drop Zone */}
        <div 
          className={`border-2 border-dashed rounded-xl p-6 transition-all duration-200 ease-in-out 
            ${isDragging 
              ? 'border-blue-500 bg-blue-50 scale-105 shadow-lg' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input 
            type="file" 
            onChange={handleFileUpload} 
            accept={currentConfig.accept}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          {file ? (
            <p className="mt-2 text-sm text-gray-600 truncate">
              ✅ Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-400 text-center">
              {isDragging ? '✨ Drop your file here!' : '📁 Drag & drop a file here, or click to browse'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Format:</label>
            {currentConfig.formats.length > 1 ? (
              <select 
                value={outputFormat} 
                onChange={(e) => setOutputFormat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {currentConfig.formats.map((fmt) => (
                  <option key={fmt} value={fmt}>{getFormatDisplay(fmt)}</option>
                ))}
              </select>
            ) : (
              <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700">
                {getFormatDisplay(currentConfig.formats[0])} (Fixed)
              </div>
            )}
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleConvert}
              disabled={isLoading || !file}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              {isLoading ? '⚡ Converting...' : '🚀 Convert Now'}
            </button>
          </div>
        </div>

        {/* --- NEW: Progress Bar --- */}
        {isLoading && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>{progressMessage}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>
        )}
        {/* --- END NEW --- */}

        {convertedFile && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center animate-fade-in">
            <span className="text-green-700 font-medium">✅ Conversion complete!</span>
            <button 
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow"
            >
              ⬇️ Download {convertedFile.name}
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          🔒 100% Client-Side · No uploads to servers · <a href="#" className="text-blue-500 hover:underline">Source on GitHub</a>
        </div>
      </div>
    </div>
  );
}

export default App;
