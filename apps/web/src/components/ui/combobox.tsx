"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Loader2, Search } from "lucide-react";
import { controlClass } from "@/components/ui/field";
import { Picker, usePopover } from "@/components/ui/picker";
import { filterOptions, type Option, type OptionPage } from "@/lib/options";

const STATIC_PAGE = 30;
const SEARCH_DELAY_MS = 250;
const MIN_POPOVER_WIDTH = 224;
const POPOVER_HEIGHT = 300;

type ComboboxProps = {
  name: string;
  id?: string;
  /** A fixed list: searched in the browser and revealed gradually as you scroll. */
  options?: Option[];
  /** A long list: called with the search text and how many options are already loaded. */
  loadOptions?: (query: string, offset: number) => Promise<OptionPage>;
  defaultValue?: string;
  /** The label of `defaultValue`, needed when it is not in the first page of a remote list. */
  defaultLabel?: string;
  /** Adds a first option with an empty value, such as "All tutors". */
  emptyLabel?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  /** Submits the surrounding form as soon as an option is chosen (filters). */
  submitOnSelect?: boolean;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function Combobox({
  name,
  id,
  options,
  loadOptions,
  defaultValue = "",
  defaultLabel,
  emptyLabel,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  required,
  disabled,
  submitOnSelect,
  className,
  onValueChange,
}: ComboboxProps) {
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [selectedLabel, setSelectedLabel] = useState(
    () => options?.find((option) => option.value === defaultValue)?.label ?? defaultLabel ?? "",
  );
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Option[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const valueInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const loadMoreRef = useRef<() => void>(() => {});

  const popover = usePopover({
    minWidth: MIN_POPOVER_WIDTH,
    height: POPOVER_HEIGHT,
    onClose: () => {
      clearTimeout(timerRef.current);
      requestRef.current++;
      setLoading(false);
    },
  });
  const { open } = popover;

  const label = value === "" && emptyLabel !== undefined ? emptyLabel : selectedLabel;
  const showEmpty = emptyLabel !== undefined && query === "";
  const rows: Option[] = showEmpty ? [{ value: "", label: emptyLabel }, ...items] : items;
  const optionId = (index: number) => `${listId}-option-${index}`;

  function fetchPage(text: string, offset: number): Promise<OptionPage> {
    if (loadOptions) return loadOptions(text, offset);
    const matches = filterOptions(options ?? [], text);
    return Promise.resolve({
      options: matches.slice(offset, offset + STATIC_PAGE),
      hasMore: offset + STATIC_PAGE < matches.length,
    });
  }

  async function load(text: string, offset: number) {
    const requestId = ++requestRef.current;
    setLoading(true);
    setFailed(false);
    try {
      const page = await fetchPage(text, offset);
      if (requestId !== requestRef.current) return;
      setItems((current) => (offset === 0 ? page.options : [...current, ...page.options]));
      setHasMore(page.hasMore);
      if (offset === 0) {
        const first = emptyLabel !== undefined && text === "" ? 1 : 0;
        const selected = page.options.findIndex((option) => option.value === value);
        setActive(selected >= 0 ? selected + first : 0);
      }
    } catch {
      if (requestId === requestRef.current) setFailed(true);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadMoreRef.current = () => {
      if (!loading) void load(query, items.length);
    };
  });

  function openPopover() {
    if (disabled) return;
    setQuery("");
    setItems([]);
    setHasMore(false);
    popover.show();
    inputRef.current?.focus();
    void load("", 0);
  }

  function choose(option: Option) {
    setValue(option.value);
    setSelectedLabel(option.label);
    onValueChange?.(option.value);
    popover.close(true);
    const input = valueInputRef.current;
    if (submitOnSelect && input) {
      input.value = option.value;
      input.form?.requestSubmit();
    }
  }

  function onSearch(text: string) {
    setQuery(text);
    clearTimeout(timerRef.current);
    if (loadOptions) timerRef.current = setTimeout(() => void load(text, 0), SEARCH_DELAY_MS);
    else void load(text, 0);
  }

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (rows[active]) choose(rows[active]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      popover.close(true);
    } else if (event.key === "Tab") {
      popover.close(false);
    }
  }

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!open || !hasMore || !sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current();
      },
      { root, rootMargin: "80px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasMore, items.length]);

  useEffect(() => {
    if (open)
      document.getElementById(`${listId}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, listId]);

  return (
    <Picker
      controller={popover}
      name={name}
      id={id}
      value={value}
      display={label}
      placeholder={placeholder}
      icon={ChevronDown}
      popup="listbox"
      popupId={listId}
      onOpen={openPopover}
      required={required}
      disabled={disabled}
      className={className}
      valueInputRef={valueInputRef}
    >
      <div className="border-cloud relative border-b p-2">
        <Search
          className="text-muted pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={rows[active] ? optionId(active) : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder={searchPlaceholder}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={onSearchKeyDown}
          className={clsx(controlClass, "pl-8")}
        />
      </div>

      <div ref={scrollRef} className="max-h-60 overflow-y-auto">
        <ul id={listId} role="listbox" aria-label={placeholder} className="py-1">
          {rows.map((option, index) => (
            <li
              key={option.value === "" ? "__empty" : option.value}
              id={optionId(index)}
              role="option"
              aria-selected={option.value === value}
              onMouseDown={(event) => event.preventDefault()}
              onMouseMove={() => setActive(index)}
              onClick={() => choose(option)}
              className={clsx(
                "flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm",
                index === active && "bg-navy/5",
              )}
            >
              <span className="min-w-0">
                <span
                  className={clsx(
                    "block truncate",
                    option.value === value && "font-semibold",
                    option.value === "" && "text-muted",
                  )}
                >
                  {option.label}
                </span>
                {option.hint && (
                  <span className="text-muted block truncate text-xs">{option.hint}</span>
                )}
              </span>
              {option.value === value && <Check className="size-4 shrink-0" aria-hidden />}
            </li>
          ))}
        </ul>
        {hasMore && <div ref={sentinelRef} aria-hidden className="h-1" />}
        <div role="status" className="text-muted px-3 py-2 text-sm empty:hidden">
          {loading && (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Loading…
            </span>
          )}
          {!loading && failed && (
            <span>
              Could not load.{" "}
              <button
                type="button"
                className="text-navy font-semibold underline"
                onClick={() => void load(query, items.length)}
              >
                Try again
              </button>
            </span>
          )}
          {!loading && !failed && rows.length === 0 && "No results"}
        </div>
      </div>
    </Picker>
  );
}
