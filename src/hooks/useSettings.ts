import { useState, useCallback } from "react";
import type { Settings } from "../types";

const STORAGE_KEY = "onewordreader-settings";

const DEFAULT_SETTINGS: Settings = {
  fontSize: 48,
  fontFamily: "Arial",
  wpm: 300,
  bgColor: "#1a1a1a",
  textColor: "#ffffff",
  strokeColor: "#000000",
  strokeWidth: 0,
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}