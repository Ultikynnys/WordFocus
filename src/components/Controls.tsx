import type { Settings } from "../types";

const FONT_OPTIONS = [
  "OpenDyslexic",
  "Arial",
  "Verdana",
  "Tahoma",
  "Trebuchet MS",
  "Georgia",
  "Times New Roman",
  "Garamond",
  "Courier New",
  "Consolas",
  "Segoe UI",
] as const;

interface ControlsProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function Controls({ settings, onUpdateSettings }: ControlsProps) {
  return (
    <div className="controls">
      <label className="control-group">
        Speed (WPM): {settings.wpm}
        <input
          type="range"
          min={60}
          max={1000}
          step={10}
          value={settings.wpm}
          onChange={(e) => onUpdateSettings({ wpm: Number(e.target.value) })}
        />
      </label>

      <label className="control-group">
        Font Size: {settings.fontSize}px
        <input
          type="range"
          min={16}
          max={200}
          step={2}
          value={settings.fontSize}
          onChange={(e) => onUpdateSettings({ fontSize: Number(e.target.value) })}
        />
      </label>

      <label className="control-group">
        Font Family:
        <select
          value={settings.fontFamily}
          onChange={(e) => onUpdateSettings({ fontFamily: e.target.value })}
        >
          {FONT_OPTIONS.map((font) => (
            <option key={font} value={font}>
              {font}
            </option>
          ))}
        </select>
      </label>

      <label className="control-group">
        Text Color:
        <input
          type="color"
          value={settings.textColor}
          onChange={(e) => onUpdateSettings({ textColor: e.target.value })}
        />
      </label>
    </div>
  );
}
