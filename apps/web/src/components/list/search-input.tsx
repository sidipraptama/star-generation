"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { controlClass } from "@/components/ui/field";

const TYPING_PAUSE_MS = 400;

type SearchInputProps = {
  defaultValue: string;
  placeholder: string;
  name?: string;
};

/** Searches while you type, after a short pause, and right away on Enter. */
export function SearchInput({ defaultValue, placeholder, name = "q" }: SearchInputProps) {
  const [text, setText] = useState(defaultValue);
  const [shown, setShown] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const searched = useRef(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The address can change without typing, for example "Clear filters": follow it.
  if (defaultValue !== shown) {
    setShown(defaultValue);
    setText(defaultValue);
  }

  useEffect(() => {
    searched.current = defaultValue;
  }, [defaultValue]);

  function search(value: string) {
    clearTimeout(timer.current);
    const trimmed = value.trim();
    if (trimmed === searched.current) return;
    searched.current = trimmed;
    inputRef.current?.form?.requestSubmit();
  }

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    setText(event.target.value);
    clearTimeout(timer.current);
    const value = event.target.value;
    timer.current = setTimeout(() => search(value), TYPING_PAUSE_MS);
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    setText("");
    search("");
    inputRef.current?.focus();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      clearTimeout(timer.current);
      searched.current = text.trim();
    } else if (event.key === "Escape" && text) {
      event.preventDefault();
      clear();
    }
  }

  return (
    <div className="relative min-w-56 flex-1">
      <Search
        className="text-muted pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        name={name}
        value={text}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        enterKeyHint="search"
        maxLength={100}
        className={`${controlClass} pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden`}
      />
      {text && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="text-muted hover:text-navy hover:bg-navy/5 rounded-card absolute top-1/2 right-1.5 -translate-y-1/2 p-1.5"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
