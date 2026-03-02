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
  const summaryClass = `${summaryClassName} ${active ? summaryActiveClassName : ""}`.trim();

  return (
    <details className={className}>
      <summary className={summaryClass}>{summaryLabel}</summary>
      <div className={bodyClassName}>{children}</div>
    </details>
  );
}
