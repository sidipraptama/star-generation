"use client";

import { useEffect, useRef, useState } from "react";

/** Scrolls a wide table sideways and tells pinned cells whether other columns sit beneath them. */
export function TableScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hiddenToTheRight, setHiddenToTheRight] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () =>
      setHiddenToTheRight(element.scrollLeft + element.clientWidth < element.scrollWidth - 1);

    update();
    element.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);

    return () => {
      element.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      data-overflowing={hiddenToTheRight ? "true" : undefined}
      className="group/table rounded-card border-cloud overflow-x-auto border bg-white"
    >
      {children}
    </div>
  );
}
