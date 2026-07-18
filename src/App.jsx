import React, { useState, useEffect } from 'react';
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
  const [outputFormat, setOutputFormat] = useState('png');
  const [isConverting, setIsConverting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [detectedType, setDetectedType] = useState(null);
  const [isMixed, setIsMixed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- File Type Detection Logic ---
  const detectFileType = (file) => {
    const type = file.type;
    if (type.startsWith('image/')) return 'image';
    if (type === 'application/pdf') return 'pdf';
    if (type.includes('word') || type.includes('document')) return 'docx';

    const name = file.name.toLowerCase();
    if (name.endsWith('.pdf')) return 'pdf';
    if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx';
    if (name.match(/\.(png|jpg|jpeg|webp|bmp|gif|svg|tiff)$/)) return 'image';

    return null;
  };

  // --- Get available output formats based on detected type ---
  const getAvailableFormats = (type) => {
    switch (type) {
      case 'image': return ['png', 'jpeg', 'webp', 'bmp'];
      case 'pdf': return ['docx', 'xlsx', 'pptx', 'txt', 'html'];
      case 'docx': return ['pdf'];
      default: return [];
    }
  };

  // --- Get format display names ---
  const getFormatDisplay = (format) => {
    const map = {
      png: 'PNG', jpeg: 'JPG', webp: 'WebP', bmp: 'BMP',
      docx: 'DOCX (Word)', xlsx: 'XLSX (Excel)', pptx: 'PPTX (PowerPoint)',
      txt: 'TXT', html: 'HTML', pdf: 'PDF'
    };
    return map[format] || format.toUpperCase();
  };

  // --- Get the convert function based on type + format ---
  const getConvertFunction = (type, format) => {
    if (type === 'image') return convertImage;
    if (type === 'pdf') {
      const map = {
        docx: convertPdfToDocx,
        xlsx: convertPdfToXlsx,
        pptx: convertPdfToPptx,
        txt: convertPdfToTxt,
        html: convertPdfToHtml
      };
      return map[format] || convertPdfToDocx;
    }
    if (type === 'docx') return convertDocxToPdf;
    return null;
  };

  // --- Get the type icon and label ---
  const getTypeDisplay = (type) => {
    switch (type) {
      case 'image': return '🖼️ Image';
      case 'pdf': return '📄 PDF';
      case 'docx': return '📄 DOCX';
      default: return '❓ Unsupported';
    }
  };

  // --- NEW: Validation Effect (Runs every time 'files' changes) ---
  useEffect(() => {
    // Reset states if no files
    if (files.length === 0) {
      setIsMixed(false);
      setErrorMessage('');
      setDetectedType(null);
      return;
    }

    // Get all file types
    const types = files.map(f => f.fileType);
    const hasNull = types.some(t => t === null);
    const allSame = types.every(t => t === types[0]) && types[0] !== null;

    // Case 1: Unsupported file types present
    if (hasNull) {
      const unsupportedNames = files.filter(f => f.fileType === null).map(f => f.name).join(', ');
      setIsMixed(true);
      setDetectedType(null);
      setErrorMessage(`❌ Unsupported file(s): ${unsupportedNames}. Please upload only Images, PDFs, or DOCX files.`);
      return;
    }

    // Case 2: Mixed types present (e.g., PDFs + Images)
    if (!allSame) {
      const uniqueTypes = [...new Set(types)];
      const typeNames = uniqueTypes.map(t => 
        t === 'image' ? 'Images' : t === 'pdf' ? 'PDFs' : 'DOCX files'
      ).join(' and ');
      setIsMixed(true);
      setDetectedType(null);
      setErrorMessage(`⚠️ Mixed file types detected (${typeNames}). Please keep only one type (Images, PDFs, or DOCX) in the queue to convert.`);
      return;
    }

    // Case 3: All files are the SAME valid type
    const detected = types[0];
    setDetectedType(detected);
    setIsMixed(false);
    setErrorMessage('');
    
    // Set default output format if needed
    const formats = getAvailableFormats(detected);
    if (formats.length > 0 && !formats.includes(outputFormat)) {
      setOutputFormat(formats[0]);
    }
  }, [files, outputFormat]);

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
      message: 'Waiting...',
      fileType: detectFileType(file) // Stores the detected type
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

  // --- Update individual file progress ---
  const updateFileProgress = (id, progress, message, status = 'converting') => {
    setFiles(prev => prev.map(f => 
      f.id === id ? { ...f, progress, message, status } : f
    ));
  };

  // --- Batch Converter ---
  const handleBatchConvert = async () => {
    if (isMixed) {
      alert('Please fix the mixed file types before converting.');
      return;
    }
    
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

    for (let i = 0; i < pendingFiles.length; i++) {
      const fileEntry = pendingFiles[i];
      const { id, file, fileType } = fileEntry;
      
      console.log(`🔄 Processing ${i+1}/${totalFiles}: ${file.name}`);

      const convertFunc = getConvertFunction(fileType, outputFormat);
      if (!convertFunc) {
        updateFileProgress(id, 0, 'Unsupported file type.', 'error');
        console.error(`❌ Unsupported type for ${file.name}`);
        continue;
      }

      updateFileProgress(id, 0, 'Starting...', 'converting');

      try {
        const onProgress = (percent, message) => {
          setFiles(prev => prev.map(f => 
            f.id === id ? { ...f, progress: percent, message: message || 'Converting...', status: 'converting' } : f
          ));
        };

        let result;
        if (fileType === 'image') {
          result = await convertImage(file, outputFormat, onProgress);
        } else {
          result = await convertFunc(file, onProgress);
        }

        const base = file.name.replace(/\.[^.]+$/, '');
        const outputName = `${base}.${outputFormat}`;

        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'done', result: { ...result, name: outputName }, progress: 100, message: 'Complete!' } : f
        ));

        completedCount++;
        console.log(`✅ ${i+1}/${totalFiles} Done: ${file.name}`);

      } catch (error) {
        setFiles(prev => prev.map(f =>
          f.id === id ? { ...f, status: 'error', message: 'Failed: ' + error.message, progress: 0 } : f
        ));
        console.error(`❌ ${i+1}/${totalFiles} Failed: ${file.name}`, error);
      }

      const overall = Math.round((completedCount / totalFiles) * 100);
      setOverallProgress(overall);
    }

    setIsConverting(false);
    console.log('🎉 Batch processing complete!');
  };

  // --- Download All ---
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
  const totalCount = files.length;

  const getButtonText = () => {
    if (isConverting) return '⚡ Converting...';
    if (pendingCount === 0) return '✅ All Converted';
    return pendingCount > 1 ? '🚀 Convert All' : '🚀 Convert';
  };

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
            accept="image/*,.pdf,.docx"
            multiple
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
          <p className="mt-2 text-sm text-gray-400 text-center">
            {isDragging ? '✨ Drop your files here!' : '📁 Drag & drop files here, or click to browse (multiple allowed)'}
          </p>
          <p className="mt-1 text-xs text-gray-400 text-center">
            Supports: Images (JPG, PNG, WebP, BMP), PDF, DOCX
          </p>
        </div>

        {/* Detected File Type Badge */}
        {detectedType && totalCount > 0 && !isMixed && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Detected:</span>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              {getTypeDisplay(detectedType)}
            </span>
            <span className="text-xs text-gray-400">
              ({totalCount} file{totalCount > 1 ? 's' : ''})
            </span>
          </div>
        )}

        {/* --- NEW: Dynamic Error Banner --- */}
        {isMixed && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <span className="text-red-500 text-lg">⚠️</span>
            <div>
              <p className="text-sm text-red-700 font-medium">Conversion Blocked</p>
              <p className="text-sm text-red-600">{errorMessage}</p>
              <p className="text-xs text-red-500 mt-1">
                Please remove or replace the incompatible files above to enable conversion.
              </p>
            </div>
          </div>
        )}

        {/* File Queue */}
        {files.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                File Queue ({totalCount}) 
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
                      {/* Show file type indicator */}
                      {fileEntry.fileType && (
                        <span className="text-xs text-gray-400">
                          {getTypeDisplay(fileEntry.fileType)}
                        </span>
                      )}
                      {!fileEntry.fileType && (
                        <span className="text-xs text-red-400">
                          ❌ Unsupported
                        </span>
                      )}
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
        {detectedType && totalCount > 0 && !isMixed && (
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Format:</label>
              {getAvailableFormats(detectedType).length > 1 ? (
                <select 
                  value={outputFormat} 
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {getAvailableFormats(detectedType).map((fmt) => (
                    <option key={fmt} value={fmt}>{getFormatDisplay(fmt)}</option>
                  ))}
                </select>
              ) : (
                <div className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 text-gray-700">
                  {getFormatDisplay(getAvailableFormats(detectedType)[0])} (Fixed)
                </div>
              )}
            </div>
            <div className="flex items-end">
              <button 
                onClick={handleBatchConvert}
                disabled={isConverting || pendingCount === 0 || isMixed}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                {getButtonText()}
              </button>
            </div>
          </div>
        )}

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
