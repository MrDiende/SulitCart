import { useEffect, useState } from "react";

export default function useAnimatedVisibility(open, duration = 220) {
  const [present, setPresent] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    if (!present) return;
    const timeout = window.setTimeout(() => setPresent(false), duration);
    return () => window.clearTimeout(timeout);
  }, [open, present, duration]);

  return { rendered: open || present, closing: !open };
}