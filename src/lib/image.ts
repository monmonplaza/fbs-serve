/** Reads an image file as a data URL, scaled down so its longest side is at most `maxSide` px (PNG keeps a QR code crisp). */
export function imageToDataUrl(file: File, maxSide = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Choose an image file'));
    const rd = new FileReader();
    rd.onerror = () => reject(new Error('Could not read the image'));
    rd.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the image'));
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d');
        if (!g) return reject(new Error('Could not read the image'));
        g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); // transparent PNGs print on white
        g.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = String(rd.result);
    };
    rd.readAsDataURL(file);
  });
}
