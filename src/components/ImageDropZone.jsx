import { useId, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

function hasFiles(event) {
  return Array.from(event.dataTransfer?.types || []).includes('Files');
}

export function useImageDropTarget({ count = 0, max = 4, onFiles }) {
  const [dragDepth, setDragDepth] = useState(0);
  const disabled = count >= max;
  const isDragging = dragDepth > 0 && !disabled;

  const addFiles = (fileList) => {
    if (disabled) return;
    const files = Array.from(fileList || []);
    if (files.length) onFiles?.(files);
  };

  const handleDragEnter = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      event.dataTransfer.dropEffect = 'none';
      return;
    }
    setDragDepth((current) => current + 1);
  };

  const handleDragOver = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy';
  };

  const handleDragLeave = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragDepth((current) => Math.max(0, current - 1));
  };

  const handleDrop = (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.stopPropagation();
    setDragDepth(0);
    addFiles(event.dataTransfer.files);
  };

  return {
    addFiles,
    disabled,
    dropTargetProps: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
    isDragging,
  };
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
  const { addFiles, disabled, dropTargetProps, isDragging } = useImageDropTarget({ count, max, onFiles });

  const handleInputChange = (event) => {
    addFiles(event.target.files);
    event.target.value = '';
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
      {...dropTargetProps}
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
