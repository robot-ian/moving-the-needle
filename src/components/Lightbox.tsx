import { useEffect, useRef, useState } from 'react';
import { useBlobUrl } from '../hooks';

export type LightboxImage = { blobKey: string; caption?: string };

export default function Lightbox({
  images,
  start,
  onClose,
}: {
  images: LightboxImage[];
  start: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(start);
  const touchX = useRef<number | null>(null);
  const current = images[Math.min(index, images.length - 1)];
  const url = useBlobUrl(current?.blobKey);

  const step = (delta: number) =>
    setIndex((i) => Math.max(0, Math.min(images.length - 1, i + delta)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images.length]);

  if (!current) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
        Close
      </button>
      <div className="lightbox-stage">{url && <img src={url} alt={current.caption ?? ''} />}</div>
      <div className="lightbox-foot">
        {current.caption && <p className="caption">{current.caption}</p>}
        {images.length > 1 && (
          <p className="lightbox-count">
            {index + 1} of {images.length}
          </p>
        )}
      </div>
    </div>
  );
}
