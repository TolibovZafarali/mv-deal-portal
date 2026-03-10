import { useRouteModalClose } from "@/shared/ui/modal/useRouteModalClose";

export function useAuthModalClose({
  navigate,
  hasBackground,
  backgroundLocation,
  forceHomeOnClose,
  closeAnimationMs,
}) {
  return useRouteModalClose({
    navigate,
    hasBackground,
    backgroundLocation,
    forceHomeOnClose,
    closeAnimationMs,
  });
}
