import { useCallback, useEffect, useRef, useState } from "react";

const DEFAULT_CLOSE_ANIMATION_MS = 180;

export function useAuthModalClose({
  navigate,
  hasBackground,
  backgroundLocation,
  forceHomeOnClose,
  closeAnimationMs = DEFAULT_CLOSE_ANIMATION_MS,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimerRef = useRef(null);
  const closingRef = useRef(false);

  const close = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    setIsClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      if (forceHomeOnClose) {
        navigate("/", { replace: true });
        return;
      }

      if (hasBackground) {
        navigate(backgroundLocation || { pathname: "/" }, { replace: true });
        return;
      }

      navigate("/", { replace: true });
    }, closeAnimationMs);
  }, [backgroundLocation, closeAnimationMs, forceHomeOnClose, hasBackground, navigate]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  return { isClosing, close };
}
