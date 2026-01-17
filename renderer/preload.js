const { contextBridge, ipcRenderer } = require('electron');

// セキュアなAPIをレンダラーに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // 設定関連
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (key, value) => ipcRenderer.invoke('set-config', key, value),

  // キャプチャ関連
  captureRegion: region => ipcRenderer.invoke('capture-region', region),

  // OCR関連
  extractText: imageBuffer => ipcRenderer.invoke('extract-text', imageBuffer),

  // 翻訳関連
  translateText: text => ipcRenderer.invoke('translate-text', text),

  // スクリーンショット処理（キャプチャ → OCR → 翻訳 の一括処理）
  processScreenshot: region => ipcRenderer.invoke('process-screenshot', region),

  // 履歴関連
  getHistory: () => ipcRenderer.invoke('get-history'),
  clearHistory: () => ipcRenderer.invoke('clear-history'),

  // ウィンドウ制御
  closeSelectionWindow: () => ipcRenderer.invoke('close-selection-window'),
  showResultWindow: result => ipcRenderer.invoke('show-result-window', result),

  // イベントリスナー
  onShowTranslationResult: callback => {
    ipcRenderer.on('show-translation-result', (event, result) => callback(result));
  },
  onShowSettings: callback => {
    ipcRenderer.on('show-settings', () => callback());
  },
  onShowHistory: callback => {
    ipcRenderer.on('show-history', () => callback());
  },

  // リスナー解除
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  },
});
