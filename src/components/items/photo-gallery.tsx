"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, ZoomIn, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoGalleryProps {
  photoUrls: string[];
  itemName: string;
}

export function PhotoGallery({ photoUrls, itemName }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photoUrls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center h-48 gap-2 text-gray-400">
        <Package className="h-10 w-10" />
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className="photo-grid">
        {photoUrls.map((url, i) => (
          <button
            key={url}
            onClick={() => setLightboxIndex(i)}
            className="relative aspect-square rounded-lg overflow-hidden group bg-gray-100 focus:outline-none focus:ring-2 focus:ring-vault-400"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${itemName} photo ${i + 1}`}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
              <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {i === 0 && (
              <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-vault-500 text-white px-1.5 py-0.5 rounded">
                Primary
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {lightboxIndex + 1} / {photoUrls.length}
          </div>

          {/* Prev */}
          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i! > 0 ? i! - 1 : i));
              }}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div
            className="max-w-4xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrls[lightboxIndex]}
              alt={`${itemName} photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
          </div>

          {/* Next */}
          {lightboxIndex < photoUrls.length - 1 && (
            <button
              className="absolute right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i! < photoUrls.length - 1 ? i! + 1 : i));
              }}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}

          {/* Thumbnail strip */}
          {photoUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-full px-4">
              {photoUrls.map((url, i) => (
                <button
                  key={url}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIndex(i);
                  }}
                  className={`w-12 h-12 rounded-md overflow-hidden shrink-0 transition-all ${
                    i === lightboxIndex
                      ? "ring-2 ring-vault-400 opacity-100"
                      : "opacity-50 hover:opacity-80"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Thumbnail ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
