let modalOpenCount = 0;
let previousBodyOverflow = "";

export function acquireModalBodyLock() {
  if (typeof document === "undefined") {
    return () => {};
  }

  modalOpenCount += 1;

  if (modalOpenCount === 1) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.classList.add("mv-modal-open");
  }

  let released = false;

  return () => {
    if (released || typeof document === "undefined") return;
    released = true;
    modalOpenCount = Math.max(0, modalOpenCount - 1);

    if (modalOpenCount === 0) {
      document.body.style.overflow = previousBodyOverflow;
      document.body.classList.remove("mv-modal-open");
    }
  };
}
