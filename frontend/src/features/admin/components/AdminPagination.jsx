function buildPages(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);

  const pages = new Set([0, 1, total - 2, total - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);

  const out = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const page = sorted[i];
    const prev = sorted[i - 1];
    if (i > 0 && page - prev > 1) out.push("…");
    out.push(page);
  }

  return out;
}

export default function AdminPagination({
  page,
  totalPages,
  onPageChange,
  className,
  buttonClassName,
  numbersClassName,
  numberButtonClassName,
  activeNumberClassName,
  dotsClassName,
  metaClassName,
  metaValueClassName,
}) {
  if (!totalPages || totalPages <= 1) return null;

  const items = buildPages(page, totalPages);

  return (
    <div className={className}>
      <button
        className={buttonClassName}
        type="button"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Prev
      </button>

      <div className={numbersClassName}>
        {items.map((item, idx) =>
          item === "…" ? (
            <span key={`dots-${idx}`} className={dotsClassName}>
              …
            </span>
          ) : (
            <button
              key={item}
              className={`${buttonClassName} ${numberButtonClassName} ${item === page ? activeNumberClassName : ""}`.trim()}
              type="button"
              onClick={() => onPageChange(item)}
            >
              {item + 1}
            </button>
          ),
        )}
      </div>

      <button
        className={buttonClassName}
        type="button"
        disabled={page === totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>

      <div className={metaClassName}>
        Page <span className={metaValueClassName}>{page + 1}</span> / <span className={metaValueClassName}>{totalPages}</span>
      </div>
    </div>
  );
}
