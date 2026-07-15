import React, { useState } from 'react';
import { convertImage } from './core/converter';

function App() {
  const [file, setFile] = useState(null);
  const [outputFormat, setOutputFormat] = useState('png');
  const [convertedFile, setConvertedFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e) => {
    const uploaded = e.target.files[0];
    if (uploaded) {
      setFile(uploaded);
      setConvertedFile(null);
    }
  };

  const handleConvert = async () => {
    if (!file) return alert('Please upload a file first.');
    setIsLoading(true);
    try {
      const result = await convertImage(file, outputFormat);
      setConvertedFile(result);
    } catch (error) {
      alert('Conversion failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!convertedFile) return;
    const link = document.createElement('a');
    link.href = convertedFile.url;
    link.download = `converted.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-blue-400 transition-colors">
          <input 
            type="file" 
            onChange={handleFileUpload} 
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-2 text-sm text-gray-600 truncate">
              ✅ Selected: <span className="font-mono">{file.name}</span> ({(file.size / 1024).toFixed(1)} KB)
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Convert to:</label>
            <select 
              value={outputFormat} 
              onChange={(e) => setOutputFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPG / JPEG</option>
              <option value="webp">WebP</option>
              <option value="bmp">BMP</option>
            </select>
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

        {convertedFile && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex justify-between items-center">
            <span className="text-green-700 font-medium">✅ Conversion complete!</span>
            <button 
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow"
            >
              ⬇️ Download
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
