"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { controlClass } from "@/components/ui/field";

type PopoverOptions = {
  minWidth: number;
  /** Room the panel needs: below this it opens above the trigger instead. */
  height: number;
  onClose?: () => void;
};

/** Anchors the panel under the trigger, or above it when there is no room below. */
function placePopover(trigger: HTMLElement, popover: HTMLElement, options: PopoverOptions) {
  const rect = trigger.getBoundingClientRect();
  const width = Math.max(rect.width, options.minWidth);
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
  const below = window.innerHeight - rect.bottom;

  popover.style.left = `${left}px`;
  popover.style.width = `${width}px`;
  if (below < options.height && rect.top > below) {
    popover.style.top = "auto";
    popover.style.bottom = `${window.innerHeight - rect.top + 4}px`;
  } else {
    popover.style.bottom = "auto";
    popover.style.top = `${rect.bottom + 4}px`;
  }
}

export function usePopover(options: PopoverOptions) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const show = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    setOpen(true);
    if (trigger && popover) {
      popover.showPopover();
      placePopover(trigger, popover, optionsRef.current);
    }
  }, []);

  const close = useCallback((refocus: boolean) => {
    popoverRef.current?.hidePopover();
    optionsRef.current.onClose?.();
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      if (triggerRef.current && popoverRef.current) {
        placePopover(triggerRef.current, popoverRef.current, optionsRef.current);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) close(false);
    };

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, close]);

  return { open, show, close, wrapperRef, triggerRef, popoverRef };
}

export type PopoverController = ReturnType<typeof usePopover>;

type PickerProps = {
  controller: PopoverController;
  name: string;
  id?: string;
  value: string;
  display: string;
  placeholder: string;
  icon: LucideIcon;
  popup: "listbox" | "dialog";
  popupId: string;
  /** Called when the trigger asks to open the panel. */
  onOpen: () => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Names the panel for screen readers when it is a dialog. */
  panelLabel?: string;
  valueInputRef?: React.Ref<HTMLInputElement>;
  children: React.ReactNode;
};

/** The trigger, the form value and the top-layer panel shared by every dropdown-style field. */
export function Picker({
  controller,
  name,
  id,
  value,
  display,
  placeholder,
  icon: Icon,
  popup,
  popupId,
  onOpen,
  required,
  disabled,
  className,
  panelLabel,
  valueInputRef,
  children,
}: PickerProps) {
  const { open, close, wrapperRef, triggerRef, popoverRef } = controller;

  function onTriggerKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!disabled) onOpen();
    }
  }

  function onPanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }

  function onBlur(event: React.FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && !wrapperRef.current?.contains(next)) close(false);
  }

  return (
    <div ref={wrapperRef} className={clsx("relative", className)} onBlur={onBlur}>
      <input
        ref={valueInputRef}
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0"
      />
      <button
        ref={triggerRef}
        type="button"
        id={id ?? name}
        role={popup === "listbox" ? "combobox" : undefined}
        aria-haspopup={popup}
        aria-expanded={open}
        aria-controls={popupId}
        disabled={disabled}
        onClick={() => (open ? close(true) : onOpen())}
        onKeyDown={onTriggerKeyDown}
        className={clsx(
          controlClass,
          "flex items-center justify-between gap-2 text-left",
          !display && "text-muted",
        )}
      >
        <span className="truncate">{display || placeholder}</span>
        <Icon className="text-muted size-4 shrink-0" aria-hidden />
      </button>

      <div
        ref={popoverRef}
        popover="manual"
        role={panelLabel ? "dialog" : undefined}
        aria-label={panelLabel}
        onKeyDown={onPanelKeyDown}
        className="rounded-card border-cloud text-navy inset-auto m-0 overflow-hidden border bg-white p-0 shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
