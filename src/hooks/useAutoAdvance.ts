import { useEffect, useRef, useCallback } from "react";

interface UseAutoAdvanceOptions {
  wpm: number;
  isPlaying: boolean;
  currentWord: string;
  onTick: () => void;
}

function getWordDurationMultiplier(word: string): number {
  const characterCount = word.replace(/\s+/g, "").length;

  if (characterCount <= 3) {
    return 1;
  }

  return Math.min(3, 1 + (characterCount - 3) / 7);
}

export function useAutoAdvance({ wpm, isPlaying, currentWord, onTick }: UseAutoAdvanceOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  const clear = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clear();
    if (isPlaying) {
      const baseMs = Math.round(60000 / wpm);
      const durationMultiplier = getWordDurationMultiplier(currentWord);
      const ms = Math.round(baseMs * durationMultiplier);

      timeoutRef.current = setTimeout(() => {
        onTickRef.current();
      }, ms);
    }
    return clear;
  }, [wpm, isPlaying, currentWord, clear]);

  return { clear };
}
