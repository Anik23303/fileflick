import React, { useState } from 'react';
import JSZip from 'jszip';
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
  // --- State ---
  const [files, setFiles] = useState([]);
  const [conversionType, setConversionType] = useState('image');
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // --- Configuration ---
  const conversionConfigs = {
    image: {
      label: 'Image Converter',
      formats: ['png', 'jpeg', 'webp', 'bmp'],
      accept: 'image/*',
      defaultFormat: 'png',
      convert: convertImage,
      getFileName: (originalName, format) => {
        const base = originalName.replace(/\.[^.]+$/, '');
        return `${base}.${format}`;
      }
    },
    pdfToDocx: {
      label: 'PDF → DOCX (Word)',
      formats: ['docx'],
      accept: '.pdf',
      defaultFormat: 'docx',
      convert: convertPdfToDocx,
      getFileName: (originalName) => originalName.replace(/\.pdf$/i, '.docx')
    },
    pdfToXlsx: {
      label: 'PDF → XLSX (Excel)',
      formats: ['xlsx'],
      accept: '.pdf',
      defaultFormat: 'xlsx',
      convert: convertPdfToXlsx,
      getFileName: (originalName) => originalName.replace(/\.pdf$/i, '.xlsx')
    },
    pdfToPptx: {
      label: 'PDF → PPTX (PowerPoint)',
      formats: ['pptx'],
      accept: '.pdf',
      defaultFormat: 'pptx',
      convert: convertPdfToPptx,
      getFileName: (originalName) => originalName.replace(/\.pdf$/i, '.pptx')
    },
    pdfToTxt: {
      label: 'PDF → TXT',
      formats: ['txt'],
      accept: '.pdf',
      defaultFormat: 'txt',
      convert: convertPdfToTxt,
      getFileName: (originalName) => originalName.replace(/\.pdf$/i, '.txt')
    },
    pdfToHtml: {
      label: 'PDF → HTML',
      formats: ['html'],
      accept: '.pdf',
      defaultFormat: 'html',
      convert: convertPdfToHtml,
      getFileName: (originalName) => originalName.replace(/\.pdf$/i, '.html')
    },
    docxToPdf: {
      label: 'DOCX → PDF',
      formats: ['pdf'],
      accept: '.docx',
      defaultFormat: 'pdf',
      convert: convertDocxToPdf,
      getFileName: (originalName) => originalName.replace(/\.docx$/i, '.pdf')
    }
  };

  const currentConfig = conversionConfigs[conversionType];

  // --- File Management ---
  const addFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const newEntries = fileArray.map((file) => ({
      id: Date.now() + Math.random() + file.name,
      file: file,
      name: file.name,
      size: file.size,
      status: 'pending',
      result: null,
      progress: 0,
      message: 'Waiting...'
    }));
    setFiles(prev => [...prev, ...newEntries]);
  };

  const removeFile = (id) => {
    if (isConverting) return;
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    if (isConverting) return;
    setFiles([]);
    setOverallProgress(0);
  };

  // --- Drag & Drop ---
  const handleDragOver = (e) => e.preventDefault();
  const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files.length > 0) {
      addFiles(e.target.files);
    }
    e.target.value = '';
  };

  // --- Update individual file progress (safe functional update) ---
  const updateFileProgress = (id, progress, message, status = 'converting') => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, progress, message, status } : f
    ));
  };

  // --- FIXED: Bulletproof Batch Converter ---
  const handleBatchConvert = async () => {
    // 1. Validation
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      alert('No pending files to convert.');
      return;
    }
    if (isConverting) return;
    
    setIsConverting(true);
    setOverallProgress(0);

    const totalFiles = pendingFiles.length;
    let completedCount = 0;

    // 2. Process files ONE BY ONE using a simple for loop
    for (let i = 0; i < pendingFiles.length; i++) {
      const fileEntry = pendingFiles[i];
      const { id, file } = fileEntry;
      
      // Log to console so you can see progress
      console.log(`🔄 Processing ${i+1}/${totalFiles}: ${file.name}`);

      // Mark as converting
      updateFileProgress(id, 0, 'Starting...', 'converting');

      try {
        // Define progress callback (safely updates only this file)
        const onProgress = (percent, message) => {
          // Update the specific file's progress
          setFiles(prev => prev.map(f => 
            f.id === id ? { ...f, progress: percent, message: message || 'Converting...', status: 'converting' } : f
          ));
        };

        // Run the conversion
        let result;
        if (conversionType === 'image') {
          result = await convertImage(file, outputFormat, onProgress);
        } else {
          result = await currentConfig.convert(file, onProgress);
        }

        // Generate output filename
        let outputName;
        if (conversionType === 'image') {
          const base = file.name.replace(/\.[^.]+$/, '');
          outputName = `${base}.${outputFormat}`;
        } else {
          outputName = currentConfig.getFileName(file.name);
        }

        // Mark as done
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'done', result: { ...result, name: outputName }, progress: 100, message: 'Complete!' } : f
        ));

        completedCount++;
        console.log(`✅ ${i+1}/${totalFiles} Done: ${file.name}`);

      } catch (error) {
        // Mark as error
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error', message: 'Failed: ' + error.message, progress: 0 } : f
        ));
        console.error(`❌ ${i+1}/${totalFiles} Failed: ${file.name}`, error);
      }

      // Update overall progress (based on completed count vs total)
      const overall = Math.round((completedCount / totalFiles) * 100);
      setOverallProgress(overall);
    }

    // 3. All done
    setIsConverting(false);
    console.log('🎉 Batch processing complete!');
  };

  // --- Download All (ZIP or Single) ---
  const handleDownloadAll = async () => {
    const doneFiles = files.filter(f => f.status === 'done' && f.result);
    if (doneFiles.length === 0) {
      alert('No converted files to download.');
      return;
    }

    if (doneFiles.length === 1) {
      const { result } = doneFiles[0];
      const link = document.createElement('a');
      link.href = result.url;
      link.download = result.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const zip = new JSZip();
    for (const fileEntry of doneFiles) {
      const blob = await fetch(fileEntry.result.url).then(r => r.blob());
      zip.file(fileEntry.result.name, blob);
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = zipUrl;
    link.download = `FileFlick_Converted_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Helpers ---
  const getFormatDisplay = (format) => {
    const map = {
      png: 'PNG', jpeg: 'JPG', webp: 'WebP', bmp: 'BMP',
      docx: 'DOCX', xlsx: 'XLSX', pptx: 'PPTX', txt: 'TXT',
      html: 'HTML', pdf: 'PDF'
    };
    return map[format] || format.toUpperCase();
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-gray-200 text-gray-700';
      case 'converting': return 'bg-blue-200 text-blue-700';
      case 'done': return 'bg-green-200 text-green-700';
      case 'error': return 'bg-red-200 text-red-700';
      default: return 'bg-gray-200 text-gray-700';
    }
  };

  const doneCount = files.filter(f => f.status === 'done').length;
  const pendingCount = files.filter(f => f.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        
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
              setFiles([]);
              setOverallProgress(0);
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
            onChange={handleFileInput} 
            accept={currentConfig.accept}
            multiple
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="mt-2 text-sm text-gray-400 text-center">
            {isDragging ? '✨ Drop your files here!' : '📁 Drag & drop files here, or click to browse (multiple allowed)'}
          </p>
        </div>

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Files ({files.length}) 
                {pendingCount > 0 && ` · ${pendingCount} pending`}
                {doneCount > 0 && ` · ${doneCount} done`}
              </h3>
              <button 
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
                disabled={isConverting}
              >
                Clear All
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
              {files.map((fileEntry) => (
                <div key={fileEntry.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(fileEntry.status)}`}>
                        {fileEntry.status}
                      </span>
                      <span className="text-sm font-medium truncate">{fileEntry.name}</span>
                      <span className="text-xs text-gray-400">{formatSize(fileEntry.size)}</span>
                    </div>
                    {fileEntry.status === 'converting' && (
                      <div className="mt-1">
                        <div className="flex justify-between text-xs text-blue-600">
                          <span>{fileEntry.message}</span>
                          <span>{Math.round(fileEntry.progress)}%</span>
                        </div>
                        <div className="w-full bg-blue-100 rounded-full h-1.5">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, fileEntry.progress)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {fileEntry.status === 'error' && (
                      <p className="text-xs text-red-500 truncate">{fileEntry.message}</p>
                    )}
                    {fileEntry.status === 'done' && fileEntry.result && (
                      <p className="text-xs text-green-600">
                        ✅ {fileEntry.result.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFile(fileEntry.id)}
                    className="ml-2 text-gray-400 hover:text-red-500 text-sm"
                    disabled={isConverting}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
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
              onClick={handleBatchConvert}
              disabled={isConverting || files.length === 0 || pendingCount === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
            >
              {isConverting ? '⚡ Converting...' : '🚀 Convert All'}
            </button>
          </div>
        </div>

        {/* Overall Progress */}
        {isConverting && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex justify-between text-sm text-blue-700 mb-1">
              <span>Overall Progress</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${Math.min(100, overallProgress)}%` }}
              />
            </div>
          </div>
        )}

        {/* Download All */}
        {doneCount > 0 && !isConverting && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
            <span className="text-green-700 font-medium">
              ✅ {doneCount} file{doneCount > 1 ? 's' : ''} converted!
            </span>
            <button 
              onClick={handleDownloadAll}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow"
            >
              ⬇️ Download {doneCount > 1 ? 'All as ZIP' : 'File'}
            </button>
          </div>
        )}

        <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
          🔒 100% Client-Side · No uploads to servers
        </div>
      </div>
    </div>
  );
}

export default App;
