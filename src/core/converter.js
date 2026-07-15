/**
 * FileFlick Core Engine
 * 100% Local Image Conversion using Canvas API
 * Privacy-first: No data ever leaves the browser.
 */

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
