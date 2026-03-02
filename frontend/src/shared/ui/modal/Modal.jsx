import { useEffect } from "react";
import "@/shared/ui/modal/Modal.css";
import { acquireModalBodyLock } from "@/shared/ui/modal/bodyLock";

export default function Modal({ open, title, children, onClose, width = 640 }) {
    useEffect(() => {
        if (!open) return;

        function onKeyDown(e) {
            if (e.key === "Escape") onClose?.();
        }

        document.addEventListener("keydown", onKeyDown);
        const releaseBodyLock = acquireModalBodyLock();

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            releaseBodyLock();
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="mv-modal-backdrop"
            onMouseDown={(e) => {
                // close only if they click the backdrop, not the modal itself
                if (e.target === e.currentTarget) onClose?.();
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="mv-modal" style={{ width }}>
                <div className="mv-modal__header">
                    <h3 className="mv-modal__title">{title}</h3>
                    <button className="mv-modal__x" onClick={onClose} type="button">
                        ✕
                    </button>
                </div>

                <div className="mv-modal__body">{children}</div>
            </div>
        </div>
    );
}
