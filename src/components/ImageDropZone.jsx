import { useId, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}

export default function ImageDropZone({
  className = '',
  count = 0,
  max = 4,
  onFiles,
  renderIcon,
}) {
  const { t } = useLanguage();
  const inputId = useId();
  const inputRef = useRef(null);
  const [dragDepth, setDragDepth] = useState(0);
  const disabled = count >= max;
  const isDragging = dragDepth > 0 && !disabled;

  const addFiles = (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList || []);
    if (files.length) onFiles?.(files);
  };

  const handleInputChange = (event) => {
    addFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragEnter = (event) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((current) => current + 1);
  };

  const handleDragOver = (event) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth((current) => Math.max(0, current - 1));
  };

  const handleDrop = (event) => {
    if (disabled || !hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth(0);
    addFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={[
        'composer-editor-footer',
        'composer-drop-zone',
        isDragging ? 'is-dragging' : '',
        disabled ? 'is-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        accept="image/*"
        id={inputId}
        multiple
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
      <button
        className="composer-attach-button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        {renderIcon?.(17)}
        {t('composer.image')}
      </button>
      <span className="composer-drop-zone__hint">
        {isDragging ? t('composer.dropPhotoActive') : t('composer.dropPhoto')}
      </span>
      <span className="composer-drop-zone__count">{count}/{max}</span>
    </div>
  );
}
