interface FilePickerProps {
  onFileLoaded: (content: string) => void;
  hasFile: boolean;
}

export function FilePicker({ onFileLoaded, hasFile }: FilePickerProps) {
  const handleOpenFile = async () => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const content = await invoke<string>("open_file");
      if (content) {
        onFileLoaded(content);
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
