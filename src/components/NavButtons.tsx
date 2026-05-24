import { useState } from "react";

interface NavButtonsProps {
  onBack10: () => void;
  onBack50: () => void;
  onForward10: () => void;
  onForward50: () => void;
  onReset: () => void;
  onSeek: (index: number) => void;
  maxWordNumber: number;
}

export function NavButtons({
  onBack10,
  onBack50,
  onForward10,
  onForward50,
  onReset,
  onSeek,
  maxWordNumber,
}: NavButtonsProps) {
  const [seekValue, setSeekValue] = useState("");

  const handleSeek = () => {
    const targetWord = Number.parseInt(seekValue, 10);
    if (!Number.isFinite(targetWord)) {
      return;
    }

    onSeek(targetWord - 1);
  };

  return (
    <div className="nav-buttons">
      <button onClick={onBack10} title="Back 10 words">Back 10</button>
      <button onClick={onBack50} title="Back 50 words">Back 50</button>
      <button onClick={onForward10} title="Forward 10 words">Skip 10</button>
      <button onClick={onForward50} title="Forward 50 words">Skip 50</button>
      <button onClick={onReset} title="Reset to beginning">Reset</button>
      <div className="seek-controls">
        <input
          type="number"
          min={1}
          max={Math.max(1, maxWordNumber)}
          step={1}
          value={seekValue}
          onChange={(event) => setSeekValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              handleSeek();
            }
          }}
          placeholder="Word #"
          title="Seek to word number"
          disabled={maxWordNumber === 0}
        />
        <button onClick={handleSeek} title="Jump to word number" disabled={maxWordNumber === 0}>
          Seek
        </button>
      </div>
    </div>
  );
}
