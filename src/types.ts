export interface Settings {
  fontSize: number;
  fontFamily: string;
  wpm: number;
  bgColor: string;
  textColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface WordReaderState {
  words: string[];
  currentIndex: number;
  isPlaying: boolean;
}

export interface OpenedFile {
  content: string;
  fileName: string;
  filePath: string;
  resumeIndex: number;
}
