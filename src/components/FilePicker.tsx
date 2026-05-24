import type { OpenedFile } from "../types";

interface FilePickerProps {
  onFileLoaded: (file: OpenedFile) => void;
  hasFile: boolean;
}

export function FilePicker({ onFileLoaded, hasFile }: FilePickerProps) {
  const handleOpenFile = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const file = await invoke<OpenedFile>("open_file");
      if (file.content) {
        onFileLoaded(file);
      }
    } catch (err) {
      console.error("Failed to open file:", err);
    }
  };

  return (
    <div className="file-picker">
      <button onClick={handleOpenFile} className="open-file-btn">
        {hasFile ? "Open Another" : "Open File"}
      </button>
      {!hasFile && <span className="hint">(.txt / .md / .epub / .epub3 / .pdf)</span>}
    </div>
  );
}
