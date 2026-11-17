"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { formatFileSize } from "@/lib/proof";

type FileInputProps = {
  id: string;
  name: string;
  accept: string;
  prompt: string;
  hint?: string;
  required?: boolean;
  /** Returns a message when the chosen file cannot be used. */
  validate?: (file: File) => string | null;
};

export function FileInput({ id, name, accept, prompt, hint, required, validate }: FileInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const release = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
  };

  useEffect(() => release, []);

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    release();
    setChosen(null);
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return clear();

    const problem = validate?.(file) ?? null;
    setError(problem);
    if (problem) return clear();

    release();
    previewUrl.current = URL.createObjectURL(file);
    setChosen({ file, url: previewUrl.current });
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        onChange={onChange}
        className="peer sr-only"
      />

      {chosen ? (
        <div className="rounded-card border-cloud flex items-center gap-3 border bg-white p-2">
          <span className="rounded-card bg-cloud/40 relative block size-14 shrink-0 overflow-hidden">
            <Image src={chosen.url} alt="" fill unoptimized sizes="56px" className="object-cover" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{chosen.file.name}</span>
            <span className="text-muted block text-xs">{formatFileSize(chosen.file.size)}</span>
          </span>
          <label
            htmlFor={id}
            className="rounded-card hover:bg-navy/5 cursor-pointer px-2 py-1 text-sm font-semibold"
          >
            Change
          </label>
          <button
            type="button"
            onClick={clear}
            aria-label="Remove the chosen image"
            className="rounded-card text-muted hover:bg-navy/5 hover:text-navy p-1.5"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          htmlFor={id}
          className="rounded-card border-cloud hover:bg-navy/5 peer-focus-visible:outline-navy flex cursor-pointer flex-col items-center gap-1 border border-dashed bg-white px-4 py-6 text-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
        >
          <ImagePlus className="text-muted size-6" aria-hidden />
          <span className="text-sm font-semibold">{prompt}</span>
          {hint && <span className="text-muted text-xs">{hint}</span>}
        </label>
      )}

      {error && (
        <p role="alert" className="text-danger-ink text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
