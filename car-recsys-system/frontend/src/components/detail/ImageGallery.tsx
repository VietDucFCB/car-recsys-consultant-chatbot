/** Thumbnail grid + click-to-open lightbox with prev/next. */
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, ImageOff, Images } from "lucide-react";

interface Props {
  images: string[];
  title?: string;
}

const ImageGallery = ({ images, title }: Props) => {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [broken, setBroken] = useState<Record<number, boolean>>({});

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-secondary flex flex-col items-center justify-center text-muted-foreground">
        <ImageOff className="h-12 w-12 mb-2 opacity-50" />
        <p className="text-sm">No images available</p>
      </div>
    );
  }

  const openAt = (i: number) => { setIdx(i); setOpen(true); };
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  return (
    <div>
      {/* Main image */}
      <button
        type="button"
        onClick={() => openAt(0)}
        className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-secondary block"
      >
        {broken[0] ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
            <ImageOff className="h-12 w-12 mb-2 opacity-50" />
            <span className="text-sm">Image not available</span>
          </div>
        ) : (
          <img
            src={images[0]}
            alt={title || "Vehicle"}
            className="w-full h-full object-cover"
            onError={() => setBroken((b) => ({ ...b, 0: true }))}
          />
        )}
      </button>

      {/* Thumbnail grid */}
      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {images.slice(1, 5).map((img, i) => {
            const realIdx = i + 1;
            return (
              <button
                key={realIdx}
                type="button"
                onClick={() => openAt(realIdx)}
                className="relative aspect-square rounded-lg overflow-hidden bg-secondary"
              >
                {broken[realIdx] ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageOff className="h-4 w-4 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => setBroken((b) => ({ ...b, [realIdx]: true }))}
                  />
                )}
              </button>
            );
          })}
          {images.length > 5 && (
            <button
              type="button"
              onClick={() => openAt(5)}
              className="aspect-square rounded-lg bg-secondary flex flex-col items-center justify-center text-foreground text-sm gap-1"
            >
              <Images className="h-5 w-5" />
              +{images.length - 5}
            </button>
          )}
        </div>
      )}

      {/* Lightbox */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setOpen(false)}>
          <button className="absolute top-4 right-4 text-white p-2" onClick={() => setOpen(false)} aria-label="Close">
            <X className="h-6 w-6" />
          </button>
          <button
            className="absolute left-4 text-white p-2"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <img
            src={images[idx]}
            alt={title || "Vehicle"}
            className="max-h-[85vh] max-w-[90vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            onError={() => setBroken((b) => ({ ...b, [idx]: true }))}
          />
          <button
            className="absolute right-4 text-white p-2"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
          <span className="absolute bottom-4 text-white text-sm">{idx + 1} / {images.length}</span>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
