import { contextBridge, ipcRenderer } from 'electron';

interface CaptureRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TranslationResult {
  originalText: string;
  translatedText: string;
  error?: string;
}

interface HistoryItem {
  id: number;
  originalText: string;
  translatedText: string;
  timestamp: string;
}

interface ConfigData {
  hotkey: string;
  deeplApiKey: string;
  ocrLang: string;
  targetLang: string;
  sourceLang: string;
  saveHistory: boolean;
  maxHistoryItems: number;
  history: HistoryItem[];
  windowBounds: { width: number; height: number };
  theme: string;
}

interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

export interface ElectronAPI {
  getConfig: () => Promise<ConfigData>;
  setConfig: (key: string, value: unknown) => Promise<boolean>;
  captureRegion: (region: CaptureRegion) => Promise<Buffer>;
  extractText: (imageBuffer: Buffer) => Promise<string>;
  translateText: (text: string) => Promise<string>;
  processScreenshot: (region: CaptureRegion) => Promise<TranslationResult>;
  getHistory: () => Promise<HistoryItem[]>;
  clearHistory: () => Promise<boolean>;
  closeSelectionWindow: () => Promise<void>;
  showResultWindow: (result: TranslationResult) => Promise<void>;
  getScreenSources: () => Promise<ScreenSource[]>;
  saveRecording: (buffer: ArrayBuffer) => Promise<string | null>;
  onShowTranslationResult: (callback: (result: TranslationResult) => void) => void;
  onShowSettings: (callback: () => void) => void;
  onShowHistory: (callback: () => void) => void;
  removeAllListeners: (channel: string) => void;
}

// Expose secure API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Config related
  getConfig: (): Promise<ConfigData> => ipcRenderer.invoke('get-config'),
  setConfig: (key: string, value: unknown): Promise<boolean> =>
    ipcRenderer.invoke('set-config', key, value),

  // Capture related
  captureRegion: (region: CaptureRegion): Promise<Buffer> =>
    ipcRenderer.invoke('capture-region', region),

  // OCR related
  extractText: (imageBuffer: Buffer): Promise<string> =>
    ipcRenderer.invoke('extract-text', imageBuffer),

  // Translation related
  translateText: (text: string): Promise<string> => ipcRenderer.invoke('translate-text', text),

  // Screenshot processing (capture → OCR → translate in one call)
  processScreenshot: (region: CaptureRegion): Promise<TranslationResult> =>
    ipcRenderer.invoke('process-screenshot', region),

  // History related
  getHistory: (): Promise<HistoryItem[]> => ipcRenderer.invoke('get-history'),
  clearHistory: (): Promise<boolean> => ipcRenderer.invoke('clear-history'),

  // Window control
  closeSelectionWindow: (): Promise<void> => ipcRenderer.invoke('close-selection-window'),
  showResultWindow: (result: TranslationResult): Promise<void> =>
    ipcRenderer.invoke('show-result-window', result),

  // Screen recording
  getScreenSources: (): Promise<ScreenSource[]> => ipcRenderer.invoke('get-screen-sources'),
  saveRecording: (buffer: ArrayBuffer): Promise<string | null> =>
    ipcRenderer.invoke('save-recording', buffer),

  // Event listeners
  onShowTranslationResult: (callback: (result: TranslationResult) => void): void => {
    ipcRenderer.on('show-translation-result', (_event, result: TranslationResult) =>
      callback(result)
    );
  },
  onShowSettings: (callback: () => void): void => {
    ipcRenderer.on('show-settings', () => callback());
  },
  onShowHistory: (callback: () => void): void => {
    ipcRenderer.on('show-history', () => callback());
  },

  // Remove listeners
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  },
} as ElectronAPI);
