const {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
} = require('electron');
const path = require('path');
const config = require('./config');
const { startCapture, captureRegion } = require('./capture');
const { extractText } = require('./ocr');
const { translate } = require('./translator');

let mainWindow = null;
let selectionWindow = null;
let tray = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  // 開発時はDevToolsを開く
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', event => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createSelectionWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  selectionWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'renderer', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  selectionWindow.loadFile(path.join(__dirname, '..', 'renderer', 'selection.html'));
  selectionWindow.setIgnoreMouseEvents(false);

  return selectionWindow;
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '翻訳開始 (Ctrl+Shift+T)',
      click: () => startSelectionMode(),
    },
    {
      label: '設定',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-settings');
      },
    },
    {
      label: '履歴',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('show-history');
      },
    },
    { type: 'separator' },
    {
      label: '終了',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Screenshot Translator');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
}

function registerHotkeys() {
  const hotkey = config.get('hotkey') || 'CommandOrControl+Shift+T';

  globalShortcut.register(hotkey, () => {
    startSelectionMode();
  });

  // ESCキーで選択モードをキャンセル
  globalShortcut.register('Escape', () => {
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
      selectionWindow = null;
    }
  });
}

async function startSelectionMode() {
  if (selectionWindow && !selectionWindow.isDestroyed()) {
    selectionWindow.close();
  }

  selectionWindow = createSelectionWindow();
  selectionWindow.show();
  selectionWindow.focus();
}

// IPC ハンドラー
ipcMain.handle('get-config', () => {
  return config.getAll();
});

ipcMain.handle('set-config', (event, key, value) => {
  config.set(key, value);
  return true;
});

ipcMain.handle('capture-region', async (event, region) => {
  try {
    const imageBuffer = await captureRegion(region);
    return imageBuffer;
  } catch (error) {
    console.error('Capture error:', error);
    throw error;
  }
});

ipcMain.handle('extract-text', async (event, imageBuffer) => {
  try {
    const text = await extractText(imageBuffer, config.get('ocrLang'));
    return text;
  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
});

ipcMain.handle('translate-text', async (event, text) => {
  try {
    const apiKey = config.get('deeplApiKey');
    if (!apiKey) {
      throw new Error('DeepL API キーが設定されていません');
    }
    const translated = await translate(
      text,
      config.get('targetLang'),
      config.get('sourceLang'),
      apiKey
    );
    return translated;
  } catch (error) {
    console.error('Translation error:', error);
    throw error;
  }
});

ipcMain.handle('process-screenshot', async (event, region) => {
  try {
    // 1. スクリーンショット取得
    const imageBuffer = await captureRegion(region);

    // 2. OCR処理
    const extractedText = await extractText(imageBuffer, config.get('ocrLang'));

    if (!extractedText || extractedText.trim() === '') {
      throw new Error('テキストを検出できませんでした');
    }

    // 3. 翻訳処理
    const apiKey = config.get('deeplApiKey');
    if (!apiKey) {
      return {
        originalText: extractedText,
        translatedText: '[DeepL APIキーが未設定です]',
        error: 'API_KEY_MISSING',
      };
    }

    const translatedText = await translate(
      extractedText,
      config.get('targetLang'),
      config.get('sourceLang'),
      apiKey
    );

    // 4. 履歴に保存
    if (config.get('saveHistory')) {
      const history = config.get('history') || [];
      history.unshift({
        id: Date.now(),
        originalText: extractedText,
        translatedText: translatedText,
        timestamp: new Date().toISOString(),
      });

      const maxItems = config.get('maxHistoryItems') || 100;
      config.set('history', history.slice(0, maxItems));
    }

    return {
      originalText: extractedText,
      translatedText: translatedText,
    };
  } catch (error) {
    console.error('Process screenshot error:', error);
    throw error;
  }
});

ipcMain.handle('get-history', () => {
  return config.get('history') || [];
});

ipcMain.handle('clear-history', () => {
  config.set('history', []);
  return true;
});

ipcMain.handle('close-selection-window', () => {
  if (selectionWindow && !selectionWindow.isDestroyed()) {
    selectionWindow.close();
    selectionWindow = null;
  }
});

ipcMain.handle('show-result-window', (event, result) => {
  mainWindow.show();
  mainWindow.webContents.send('show-translation-result', result);
});

// アプリケーション起動
app.whenReady().then(() => {
  createMainWindow();
  createTray();
  registerHotkeys();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  app.isQuitting = true;
});
