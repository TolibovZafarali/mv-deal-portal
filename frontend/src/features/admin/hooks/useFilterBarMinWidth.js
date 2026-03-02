import { useEffect, useState } from "react";

export default function useFilterBarMinWidth(minWidth) {
  const [element, setElement] = useState(null);
  const [width, setWidth] = useState(0);
  const [isWideEnough, setIsWideEnough] = useState(false);

  useEffect(() => {
    if (!element) return undefined;

    function updateFromWidth(width) {
      setWidth(width);
      setIsWideEnough(width >= minWidth);
    }

    function measure() {
      updateFromWidth(element.getBoundingClientRect().width);
    }

    measure();

    if (typeof ResizeObserver === "function") {
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width;
        if (typeof width === "number") {
          updateFromWidth(width);
          return;
        }
        measure();
      });

      observer.observe(element);
      return () => observer.disconnect();
    }

    if (typeof window === "undefined") return undefined;

    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [element, minWidth]);

  return { setFilterBarRef: setElement, isWideEnough, width };
}
