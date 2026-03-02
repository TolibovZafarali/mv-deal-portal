import { useEffect, useRef, useState } from "react";

export default function AdminFilterBar({
  className = "",
  rowClassName = "",
  onSubmit,
  containerRef,
  children,
}) {
  return (
    <form ref={containerRef} className={className} onSubmit={onSubmit ?? ((e) => e.preventDefault())}>
      <div className={rowClassName}>{children}</div>
    </form>
  );
}

export function AdminFilterMore({
  className = "",
  summaryClassName = "",
  summaryActiveClassName = "",
  bodyClassName = "",
  active = false,
  summaryLabel = "More",
  children,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const summaryClass = `${summaryClassName} ${active ? summaryActiveClassName : ""}`.trim();
  const detailsClass = `${className} ${open ? `${className}--open` : ""}`.trim();

  useEffect(() => {
    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <details ref={rootRef} className={detailsClass} open={open}>
      <summary
        className={summaryClass}
        aria-expanded={open}
        onClick={(event) => {
          event.preventDefault();
          setOpen((prev) => !prev);
        }}
      >
        {summaryLabel}
      </summary>
      <div className={bodyClassName} hidden={!open}>
        {children}
      </div>
    </details>
  );
}
