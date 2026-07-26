export function prepareForumImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Unsupported image format'));
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        const src = canvas.toDataURL('image/jpeg', 0.82);

        resolve({
          id: `${file.name}-${file.lastModified}-${file.size}`,
          name: file.name,
          size: Math.round(src.length * 0.75),
          src,
        });
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
