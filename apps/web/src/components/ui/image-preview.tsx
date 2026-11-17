"use client";

import { useState } from "react";
import Image from "next/image";
import { Modal } from "@/components/ui/modal";

type ImagePreviewProps = {
  src: string;
  title: string;
  description?: string;
};

/** A small thumbnail that opens the full image in a dialog. */
export function ImagePreview({ src, title, description }: ImagePreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${title.toLowerCase()}`}
        className="rounded-card border-cloud hover:border-navy relative block size-12 shrink-0 overflow-hidden border bg-white"
      >
        <Image src={src} alt="" fill unoptimized sizes="48px" className="object-cover" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="space-y-3 p-5">
          <div className="rounded-card bg-cloud/30 relative h-[60vh] overflow-hidden">
            <Image
              src={src}
              alt={title}
              fill
              unoptimized
              sizes="512px"
              className="object-contain"
            />
          </div>
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold underline"
          >
            Open in a new tab
          </a>
        </div>
      </Modal>
    </>
  );
}
