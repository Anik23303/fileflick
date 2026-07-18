// FileFlick Extension - Smart Popup (Image Converter with Batch + UI Upgrade)
// No external imports needed. Uses Canvas API for images.

// --- State ---
let files = [];
let isConverting = false;
let isDragging = false;
let detectedType = null; // 'image' or null
let isMixed = false;
let errorMessage = '';
let outputFormat = 'png';

// --- DOM Elements ---
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const queueContainer = document.getElementById('queueContainer');
const statusText = document.getElementById('statusText');
const errorBanner = document.getElementById('errorBanner');
const errorMessageEl = document.getElementById('errorMessage');
const formatSelect = document.getElementById('formatSelect');
const convertBtn = document.getElementById('convertBtn');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressMsg = document.getElementById('progressMsg');
const progressPercent = document.getElementById('progressPercent');

// --- Helpers ---
const getFormatDisplay = (fmt) => {
  const map = { png: 'PNG', jpeg: 'JPG', webp: 'WebP', bmp: 'BMP' };
  return map[fmt] || fmt.toUpperCase();
};

const formatSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

const detectFileType = (file) => {
  const type = file.type;
  if (type.startsWith('image/')) return 'image';
  const name = file.name.toLowerCase();
  if (name.match(/\.(png|jpg|jpeg|webp|bmp|gif|svg|tiff)$/)) return 'image';
  return null;
};

// --- Render Queue ---
const renderQueue = () => {
  if (files.length === 0) {
    queueContainer.innerHTML = '';
    statusText.textContent = 'No files uploaded.';
    return;
  }

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const doneCount = files.filter(f => f.status === 'done').length;
  statusText.textContent = `${files.length} files · ${pendingCount} pending · ${doneCount} done`;

  let html = '';
  files.forEach((f, index) => {
    const isUnsupported = f.fileType === null;
    const badgeClass = isUnsupported ? 'badge unsupported' : 'badge';
    const badgeText = isUnsupported ? '❌ Unsupported' : '🖼️ Image';
    html += `
      <div class="file-item" data-id="${f.id}">
        <div class="info">
          <span class="${badgeClass}">${badgeText}</span>
          <span class="name">${f.name}</span>
          <span style="color:#94a3b8;font-size:10px;">${formatSize(f.size)}</span>
          ${f.status === 'converting' ? `<span style="color:#2563eb;font-size:10px;">${Math.round(f.progress)}%</span>` : ''}
          ${f.status === 'done' ? `<span style="color:#22c55e;font-size:10px;">✅</span>` : ''}
          ${f.status === 'error' ? `<span style="color:#ef4444;font-size:10px;">❌</span>` : ''}
        </div>
        <span class="remove" data-id="${f.id}">✕</span>
      </div>
    `;
  });
  queueContainer.innerHTML = html;

  // Attach remove events
  document.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      removeFile(id);
    });
  });

  // Update validation and UI state
  validateAndUpdateUI();
};

// --- Validation & UI Update ---
const validateAndUpdateUI = () => {
  if (files.length === 0) {
    detectedType = null;
    isMixed = false;
    errorMessage = '';
    errorBanner.classList.remove('show');
    formatSelect.disabled = true;
    convertBtn.disabled = true;
    convertBtn.textContent = 'Convert';
    return;
  }

  const types = files.map(f => f.fileType);
  const hasNull = types.some(t => t === null);
  const allSame = types.every(t => t === types[0]) && types[0] !== null;

  if (hasNull) {
    const unsupportedNames = files.filter(f => f.fileType === null).map(f => f.name).join(', ');
    detectedType = null;
    isMixed = true;
    errorMessage = `Unsupported file(s): ${unsupportedNames}. Please upload only images.`;
    errorBanner.classList.add('show');
    errorMessageEl.textContent = errorMessage;
    formatSelect.disabled = true;
    convertBtn.disabled = true;
    convertBtn.textContent = 'Convert';
    return;
  }

  if (!allSame) {
    detectedType = null;
    isMixed = true;
    errorMessage = `Mixed file types detected. Please upload only images.`;
    errorBanner.classList.add('show');
    errorMessageEl.textContent = errorMessage;
    formatSelect.disabled = true;
    convertBtn.disabled = true;
    convertBtn.textContent = 'Convert';
    return;
  }

  // All are valid images
  detectedType = 'image';
  isMixed = false;
  errorBanner.classList.remove('show');
  
  // Enable format select
  formatSelect.disabled = false;
  
  // Determine button text
  const pendingCount = files.filter(f => f.status === 'pending').length;
  if (pendingCount === 0) {
    convertBtn.disabled = true;
    convertBtn.textContent = '✅ All Converted';
  } else {
    convertBtn.disabled = false;
    convertBtn.textContent = pendingCount > 1 ? '🚀 Convert All' : '🚀 Convert';
  }
};

// --- File Management ---
const addFiles = (newFileList) => {
  const newEntries = Array.from(newFileList).map((file) => ({
    id: Date.now() + Math.random() + file.name,
    file: file,
    name: file.name,
    size: file.size,
    status: 'pending', // pending, converting, done, error
    progress: 0,
    message: 'Waiting...',
    fileType: detectFileType(file),
    result: null
  }));

  // Filter out duplicates (by name and size)
  const existingNames = new Set(files.map(f => f.name + f.size));
  const filtered = newEntries.filter(f => !existingNames.has(f.name + f.size));
  
  if (filtered.length === 0) {
    statusText.textContent = 'Duplicate files ignored.';
    return;
  }

  files = [...files, ...filtered];
  renderQueue();
};

const removeFile = (id) => {
  if (isConverting) return;
  files = files.filter(f => f.id !== id);
  renderQueue();
};

// --- Image Converter (Built-in, No Imports) ---
const convertImage = (file, targetFormat) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Not an image.'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        let mimeType = `image/${targetFormat}`;
        if (targetFormat === 'jpeg') mimeType = 'image/jpeg';
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('Conversion failed.'));
          const url = URL.createObjectURL(blob);
          resolve({ url, blob, name: `converted.${targetFormat}` });
        }, mimeType, 0.92);
      };
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};

// --- Batch Convert ---
const handleConvert = async () => {
  const pendingFiles = files.filter(f => f.status === 'pending');
  if (pendingFiles.length === 0 || isMixed || isConverting) return;
  
  isConverting = true;
  convertBtn.disabled = true;
  convertBtn.textContent = '⚡ Converting...';
  progressWrap.classList.add('show');

  const total = pendingFiles.length;
  let completed = 0;

  for (let i = 0; i < pendingFiles.length; i++) {
    const entry = pendingFiles[i];
    const idx = files.indexOf(entry);
    if (idx === -1) continue;

    // Update status
    files[idx].status = 'converting';
    files[idx].progress = 0;
    files[idx].message = 'Starting...';
    renderQueue();

    try {
      // Simulate progress for visual feedback
      const onProgress = (pct, msg) => {
        files[idx].progress = pct;
        files[idx].message = msg || 'Converting...';
        progressFill.style.width = `${pct}%`;
        progressPercent.textContent = `${Math.round(pct)}%`;
        progressMsg.textContent = msg || 'Converting...';
        renderQueue();
      };

      onProgress(10, 'Reading image...');
      const result = await convertImage(entry.file, outputFormat);
      onProgress(100, 'Done!');

      files[idx].status = 'done';
      files[idx].result = result;
      files[idx].progress = 100;
      files[idx].message = 'Complete!';
      
      completed++;
      const overallPct = Math.round((completed / total) * 100);
      progressFill.style.width = `${overallPct}%`;
      progressPercent.textContent = `${overallPct}%`;
      progressMsg.textContent = `Processed ${completed}/${total}`;

    } catch (err) {
      files[idx].status = 'error';
      files[idx].message = 'Failed: ' + err.message;
      files[idx].progress = 0;
    }
    renderQueue();
  }

  isConverting = false;
  progressWrap.classList.remove('show');
  validateAndUpdateUI();

  // If all done, show download button / auto-download?
  const doneFiles = files.filter(f => f.status === 'done' && f.result);
  if (doneFiles.length > 0) {
    // Download all as ZIP (using JSZip from CDN)
    if (typeof JSZip !== 'undefined' && doneFiles.length > 1) {
      const zip = new JSZip();
      for (const f of doneFiles) {
        const blob = await fetch(f.result.url).then(r => r.blob());
        const base = f.name.replace(/\.[^.]+$/, '');
        zip.file(`${base}.${outputFormat}`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      chrome.downloads.download({ url, filename: 'FileFlick_Converted.zip', saveAs: true });
    } else if (doneFiles.length === 1) {
      chrome.downloads.download({
        url: doneFiles[0].result.url,
        filename: doneFiles[0].result.name || `converted.${outputFormat}`,
        saveAs: true
      });
    } else {
      // Multiple done but JSZip not loaded? fallback to download one by one (but user will get multiple prompts)
      for (const f of doneFiles) {
        chrome.downloads.download({
          url: f.result.url,
          filename: f.result.name || `converted.${outputFormat}`,
          saveAs: false
        });
      }
    }
  }
};

// --- Event Listeners ---
// Drop Zone
dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) {
    addFiles(e.target.files);
  }
  e.target.value = '';
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files.length > 0) {
    addFiles(e.dataTransfer.files);
  }
});

// Format Select
formatSelect.addEventListener('change', (e) => {
  outputFormat = e.target.value;
});

// Convert Button
convertBtn.addEventListener('click', handleConvert);

// --- Init ---
// Populate format select
const formats = ['png', 'jpeg', 'webp', 'bmp'];
formatSelect.innerHTML = formats.map(f => `<option value="${f}">${getFormatDisplay(f)}</option>`).join('');
outputFormat = 'png';
formatSelect.value = 'png';

renderQueue();
console.log('FileFlick Extension Popup ready!');
