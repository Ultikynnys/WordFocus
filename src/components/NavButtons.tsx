interface NavButtonsProps {
  onBack10: () => void;
  onBack50: () => void;
  onForward10: () => void;
  onForward50: () => void;
  onReset: () => void;
}

export function NavButtons({ onBack10, onBack50, onForward10, onForward50, onReset }: NavButtonsProps) {
  return (
    <div className="nav-buttons">
      <button onClick={onBack10} title="Back 10 words">Back 10</button>
      <button onClick={onBack50} title="Back 50 words">Back 50</button>
      <button onClick={onForward10} title="Forward 10 words">Skip 10</button>
      <button onClick={onForward50} title="Forward 50 words">Skip 50</button>
      <button onClick={onReset} title="Reset to beginning">Reset</button>
    </div>
  );
}
