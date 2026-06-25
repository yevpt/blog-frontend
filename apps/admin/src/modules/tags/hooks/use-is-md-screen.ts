import { useEffect, useState } from "react";

const MD_MEDIA_QUERY = "(min-width: 768px)";

function getIsMdScreen() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MD_MEDIA_QUERY).matches;
}

export function useIsMdScreen() {
  const [isMdScreen, setIsMdScreen] = useState(getIsMdScreen);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MD_MEDIA_QUERY);
    const handleChange = () => setIsMdScreen(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isMdScreen;
}
