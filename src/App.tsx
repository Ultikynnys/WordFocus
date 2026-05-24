import { useState, useCallback, useEffect } from "react";
import type { OpenedFile, WordReaderState } from "./types";
import { useSettings } from "./hooks/useSettings";
import { useAutoAdvance } from "./hooks/useAutoAdvance";
import { WordDisplay } from "./components/WordDisplay";
import { Controls } from "./components/Controls";
import { NavButtons } from "./components/NavButtons";
import { FilePicker } from "./components/FilePicker";
import { SettingsPanel } from "./components/SettingsPanel";

function parseWords(text: string): string[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return [];
  }

  const parsed: string[] = [];
  let shortPrefix = "";

  for (const token of tokens) {
    const wordLength = token.replace(/[^A-Za-z0-9]/g, "").length;

    if (wordLength > 0 && wordLength < 3) {
      shortPrefix = shortPrefix ? `${shortPrefix} ${token}` : token;
      continue;
    }

    parsed.push(shortPrefix ? `${shortPrefix} ${token}` : token);
    shortPrefix = "";
  }

  if (shortPrefix) {
    parsed.push(shortPrefix);
  }

  return parsed;
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export default function App() {
  const [state, setState] = useState<WordReaderState>({
    words: [],
    currentIndex: 0,
    isPlaying: false,
  });
  const [currentFileName, setCurrentFileName] = useState("");
  const [currentFilePath, setCurrentFilePath] = useState("");
  const { settings, updateSettings } = useSettings();

  const advanceWord = useCallback(() => {
    setState((prev) => {
      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.words.length) {
        return { ...prev, isPlaying: false };
      }
      return { ...prev, currentIndex: nextIndex };
    });
  }, []);

  useAutoAdvance({
    wpm: settings.wpm,
    isPlaying: state.isPlaying,
    currentWord: state.words[state.currentIndex] ?? "",
    onTick: advanceWord,
  });

  const handleFileLoaded = useCallback((file: OpenedFile) => {
    const words = parseWords(file.content);
    const resumeIndex = Math.min(Math.max(0, file.resumeIndex), Math.max(0, words.length - 1));
    const shouldResume = resumeIndex > 0 && words.length > 0;
    setState({ words, currentIndex: resumeIndex, isPlaying: !shouldResume && words.length > 0 });
    setCurrentFileName(file.fileName);
    setCurrentFilePath(file.filePath);
  }, []);

  const handleBack10 = useCallback(() => {
    setState((prev) => ({ ...prev, currentIndex: Math.max(0, prev.currentIndex - 10), isPlaying: false }));
  }, []);

  const handleBack50 = useCallback(() => {
    setState((prev) => ({ ...prev, currentIndex: Math.max(0, prev.currentIndex - 50), isPlaying: false }));
  }, []);

  const handleForward10 = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(Math.max(0, prev.words.length - 1), prev.currentIndex + 10),
      isPlaying: false,
    }));
  }, []);

  const handleForward50 = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(Math.max(0, prev.words.length - 1), prev.currentIndex + 50),
      isPlaying: false,
    }));
  }, []);

  const handleReset = useCallback(() => {
    setState((prev) => ({ ...prev, currentIndex: 0, isPlaying: false }));
  }, []);

  const handleSeek = useCallback((targetIndex: number) => {
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(Math.max(0, targetIndex), Math.max(0, prev.words.length - 1)),
      isPlaying: false,
    }));
  }, []);

  const togglePlay = useCallback(() => {
    setState((prev) => {
      if (prev.words.length === 0) return prev;
      if (prev.currentIndex >= prev.words.length - 1) {
        return { ...prev, currentIndex: 0, isPlaying: true };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  useEffect(() => {
    document.documentElement.style.backgroundColor = settings.bgColor;
  }, [settings.bgColor]);

  useEffect(() => {
    if (!currentFilePath || state.words.length === 0) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        if (!isCancelled) {
          await invoke("save_reading_state", {
            filePath: currentFilePath,
            currentIndex: state.currentIndex,
          });
        }
      } catch (error) {
        console.error("Failed to save reading state:", error);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [currentFilePath, state.currentIndex, state.words.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const tagName = (event.target as HTMLElement).tagName;
      if (tagName === "INPUT" || tagName === "SELECT") return;

      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          event.preventDefault();
          setState((prev) => ({
            ...prev,
            currentIndex: Math.max(0, prev.currentIndex - 1),
            isPlaying: false,
          }));
          break;
        case "ArrowRight":
          event.preventDefault();
          setState((prev) => ({
            ...prev,
            currentIndex: Math.min(prev.words.length - 1, prev.currentIndex + 1),
            isPlaying: false,
          }));
          break;
        case "+":
        case "=":
          event.preventDefault();
          updateSettings({ wpm: Math.min(1000, settings.wpm + 10) });
          break;
        case "-":
        case "_":
          event.preventDefault();
          updateSettings({ wpm: Math.max(60, settings.wpm - 10) });
          break;
        case "o":
        case "O":
          event.preventDefault();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, updateSettings, settings.wpm]);

  const currentWord = state.words[state.currentIndex] ?? "";
  const isLight = getLuminance(settings.bgColor) > 0.5;
  const adaptiveVars = {
    "--text-primary": isLight ? "#1a1a1a" : "#ffffff",
    "--text-secondary": isLight ? "#666666" : "#aaaaaa",
    "--surface": isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)",
    "--surface-hover": isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.14)",
    "--border": isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)",
    "--input-surface": isLight ? "#ffffff" : "rgba(255,255,255,0.12)",
    "--option-surface": isLight ? "#ffffff" : "#1f1f1f",
    "--option-text": isLight ? "#1a1a1a" : "#ffffff",
  } as React.CSSProperties;

  return (
    <div className="app" style={adaptiveVars}>
      <div className="word-area">
        {currentFileName && (
          <div className="current-file-name" style={{ color: settings.textColor }} title={currentFileName}>
            {currentFileName}
          </div>
        )}
        <WordDisplay
          word={currentWord}
          fontSize={settings.fontSize}
          fontFamily={settings.fontFamily}
          textColor={settings.textColor}
          strokeColor={settings.strokeColor}
          strokeWidth={settings.strokeWidth}
        />
        {state.words.length > 0 && (
          <div className="progress">
            {state.currentIndex + 1} / {state.words.length}
          </div>
        )}
      </div>
      <div className="controls-bar">
        <FilePicker onFileLoaded={handleFileLoaded} hasFile={state.words.length > 0} />
        <Controls settings={settings} onUpdateSettings={updateSettings} />
        <div className="playback-controls">
          <button onClick={togglePlay} className="play-btn" disabled={state.words.length === 0}>
            {state.isPlaying ? "Pause" : "Play"}
          </button>
          <NavButtons
            onBack10={handleBack10}
            onBack50={handleBack50}
            onForward10={handleForward10}
            onForward50={handleForward50}
            onReset={handleReset}
            onSeek={handleSeek}
            maxWordNumber={state.words.length}
          />
        </div>
        <SettingsPanel settings={settings} onUpdateSettings={updateSettings} />
      </div>
    </div>
  );
}
