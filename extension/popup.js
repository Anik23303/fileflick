// FileFlick Chrome Extension - Popup (Standalone Version)
// No external imports needed. All conversion logic is built-in.

document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const formatSelect = document.getElementById('formatSelect');
  let selectedFile = null;

  // ----- Helper: Image Converter (Built directly into the extension) -----
  const convertImage = (file, targetFormat) => {
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

  // ----- UI Event Listeners -----
  dropZone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      dropZone.innerHTML = `✅ ${selectedFile.name}`;
      dropZone.style.borderColor = '#22c55e';
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#3b82f6';
    dropZone.style.background = '#eff6ff';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#94a3b8';
    dropZone.style.background = 'white';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#94a3b8';
    dropZone.style.background = 'white';
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      dropZone.innerHTML = `✅ ${selectedFile.name}`;
      dropZone.style.borderColor = '#22c55e';
    }
  });

  // ----- Convert Button Logic -----
  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      alert('Please drop or select an image.');
      return;
    }

    const format = formatSelect.value;
    convertBtn.textContent = '⏳ Converting...';
    convertBtn.disabled = true;

    try {
      const result = await convertImage(selectedFile, format);
      
      // Download using Chrome's download API
      chrome.downloads.download({
        url: result.url,
        filename: `FileFlick_Converted.${format}`,
        saveAs: true
      }, () => {
        // Revoke the blob URL to free memory
        URL.revokeObjectURL(result.url);
        convertBtn.textContent = '✅ Done!';
        setTimeout(() => {
          convertBtn.textContent = '🚀 Convert & Download';
          convertBtn.disabled = false;
        }, 2000);
      });

    } catch (error) {
      alert('Error: ' + error.message);
      convertBtn.textContent = '🚀 Convert & Download';
      convertBtn.disabled = false;
    }
  });
});
