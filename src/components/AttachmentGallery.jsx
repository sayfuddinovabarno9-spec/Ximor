export default function AttachmentGallery({ images = [], size = 'thumb' }) {
  if (!images.length) return null;

  return (
    <div className={`attachment-gallery attachment-gallery--${size}`}>
      {images.map(image => (
        <figure key={image.id}>
          <img alt={image.name || 'Rasm'} src={image.src} />
        </figure>
      ))}
    </div>
  );
}
