/**
 * HTML5 Canvas Image Compression Utility
 * Ported & enhanced from bkk-careplan project
 */

/**
 * Compress an image file using HTML5 Canvas
 * @param {File} file - Original image file
 * @param {number} maxDimension - Maximum width/height boundary (default: 1280px)
 * @param {number} quality - JPEG compression quality 0.0 to 1.0 (default: 0.75)
 * @returns {Promise<{name: string, url: string, file: File, originalSize: number, compressedSize: number}>}
 */
export function compressImage(file, maxDimension = 1280, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      return reject(new Error('กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น (เช่น JPG, PNG, WEBP)'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize proportionally if dimensions exceed maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Convert Base64 data URL back to a File object for multipart uploads if needed
        const arr = compressedDataUrl.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const compressedFile = new File([u8arr], file.name, { type: mime });

        resolve({
          name: file.name,
          url: compressedDataUrl,
          file: compressedFile,
          originalSize: file.size,
          compressedSize: compressedFile.size,
        });
      };

      img.onerror = () => reject(new Error('ไม่สามารถประมวลผลไฟล์รูปภาพได้'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}
