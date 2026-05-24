import type { Settings } from "../types";

interface SettingsPanelProps {
  settings: Settings;
  onUpdateSettings: (partial: Partial<Settings>) => void;
}

export function SettingsPanel({ settings, onUpdateSettings }: SettingsPanelProps) {
  return (
    <div className="settings-panel">
      <label className="control-group">
        Stroke Color:
        <input
          type="color"
          value={settings.strokeColor}
          onChange={(e) => onUpdateSettings({ strokeColor: e.target.value })}
        />
      </label>

      <label className="control-group">
        Stroke Width: {settings.strokeWidth}px
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={settings.strokeWidth}
          onChange={(e) => onUpdateSettings({ strokeWidth: Number(e.target.value) })}
        />
      </label>

      <label className="control-group">
        Background Color:
        <input
          type="color"
          value={settings.bgColor}
          onChange={(e) => onUpdateSettings({ bgColor: e.target.value })}
        />
      </label>
    </div>
  );
}