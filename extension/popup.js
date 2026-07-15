document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const convertBtn = document.getElementById('convertBtn');
  const formatSelect = document.getElementById('formatSelect');
  let selectedFile = null;

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      selectedFile = e.target.files[0];
      dropZone.innerHTML = `✅ ${selectedFile.name}`;
      dropZone.style.borderColor = '#22c55e';
    }
  });

  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = '#3b82f6'; });
  dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = '#94a3b8'; });
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#94a3b8';
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      dropZone.innerHTML = `✅ ${selectedFile.name}`;
      dropZone.style.borderColor = '#22c55e';
    }
  });

  convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return alert('Please drop or select an image.');
    const format = formatSelect.value;
    try {
      // Import the shared core engine
      const { convertImage } = await import('../src/core/converter.js');
      convertBtn.textContent = '⏳ Converting...';
      convertBtn.disabled = true;
      const result = await convertImage(selectedFile, format);
      chrome.downloads.download({
        url: result.url,
        filename: `FileFlick_Converted.${format}`,
        saveAs: true
      }, () => {
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
