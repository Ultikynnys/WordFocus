import { useLayoutEffect, useRef, useState } from "react";

const MIN_FONT_SIZE = 1;
const FONT_SIZE_PRECISION = 0.5;

interface WordDisplayProps {
  word: string;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export function WordDisplay({ word, fontSize, fontFamily, textColor, strokeColor, strokeWidth }: WordDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [displayFontSize, setDisplayFontSize] = useState(fontSize);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) {
      return;
    }

    let frameId = 0;

    const measureText = (size: number) => {
      measure.style.fontSize = `${size}px`;
      return measure.getBoundingClientRect();
    };

    const updateFontSize = () => {
      const containerStyles = window.getComputedStyle(container);
      const availableWidth = Math.max(
        1,
        container.clientWidth - parseFloat(containerStyles.paddingLeft) - parseFloat(containerStyles.paddingRight),
      );
      const availableHeight = Math.max(
        1,
        container.clientHeight - parseFloat(containerStyles.paddingTop) - parseFloat(containerStyles.paddingBottom),
      );

      const minimumBounds = measureText(MIN_FONT_SIZE);
      if (minimumBounds.width > availableWidth || minimumBounds.height > availableHeight) {
        setDisplayFontSize(MIN_FONT_SIZE);
        return;
      }

      const maximumBounds = measureText(fontSize);
      if (maximumBounds.width <= availableWidth && maximumBounds.height <= availableHeight) {
        setDisplayFontSize(fontSize);
        return;
      }

      let low = MIN_FONT_SIZE;
      let high = fontSize;
      let best = MIN_FONT_SIZE;

      while (high - low > FONT_SIZE_PRECISION) {
        const mid = (low + high) / 2;
        const bounds = measureText(mid);

        if (bounds.width <= availableWidth && bounds.height <= availableHeight) {
          best = mid;
          low = mid;
        } else {
          high = mid;
        }
      }

      const nextFontSize = Math.max(MIN_FONT_SIZE, Math.floor(best * 10) / 10);
      setDisplayFontSize((current) => (current === nextFontSize ? current : nextFontSize));
    };

    updateFontSize();

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateFontSize);
    });

    observer.observe(container);

    const fontSet = document.fonts;
    const handleFontsReady = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateFontSize);
    };

    fontSet.addEventListener("loadingdone", handleFontsReady);
    void fontSet.ready.then(handleFontsReady);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      fontSet.removeEventListener("loadingdone", handleFontsReady);
    };
  }, [fontFamily, fontSize, strokeWidth, word]);

  const strokeStyle =
    strokeWidth > 0
      ? `${strokeWidth}px ${strokeColor}`
      : "none";

  return (
    <div ref={containerRef} className="word-display">
      <span
        className="word-display-text"
        style={{
          fontSize: `${displayFontSize}px`,
          fontFamily,
          color: textColor,
          WebkitTextStroke: strokeStyle,
          textShadow: strokeWidth > 0 ? "none" : undefined,
        }}
      >
        {word || "—"}
      </span>
      <span
        ref={measureRef}
        className="word-display-measure"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily,
          WebkitTextStroke: strokeStyle,
          textShadow: strokeWidth > 0 ? "none" : undefined,
        }}
      >
        {word || "—"}
      </span>
    </div>
  );
}
