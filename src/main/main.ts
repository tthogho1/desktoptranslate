import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  screen,
  Tray,
  Menu,
  nativeImage,
  IpcMainInvokeEvent,
} from 'electron';
import path from 'path';
import { config, HistoryItem } from './config';
import { captureRegion, CaptureRegion } from './capture';
import { extractText } from './ocr';
import { translate } from './translator';
import { getScreenSources, saveRecording, ScreenSource } from './recorder';

let mainWindow: BrowserWindow | null = null;
let selectionWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

declare global {
  namespace Electron {
    interface App {
      isQuitting?: boolean;
    }
  }
}

(app as Electron.App).isQuitting = false;

function createMainWindow(): void {
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

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', event => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}

function createSelectionWindow(): BrowserWindow {
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

  selectionWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'selection.html'));
  selectionWindow.setIgnoreMouseEvents(false);

  return selectionWindow;
}

function createTray(): void {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start Translation (Ctrl+Shift+T)',
      click: () => startSelectionMode(),
    },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('show-settings');
      },
    },
    {
      label: 'History',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('show-history');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Screenshot Translator');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
}

function registerHotkeys(): void {
  const hotkey = config.get('hotkey') || 'CommandOrControl+Shift+T';

  globalShortcut.register(hotkey, () => {
    startSelectionMode();
  });

  // Cancel selection mode with ESC key
  globalShortcut.register('Escape', () => {
    if (selectionWindow && !selectionWindow.isDestroyed()) {
      selectionWindow.close();
      selectionWindow = null;
    }
  });
}

async function startSelectionMode(): Promise<void> {
  if (selectionWindow && !selectionWindow.isDestroyed()) {
    selectionWindow.close();
  }

  selectionWindow = createSelectionWindow();
  selectionWindow.show();
  selectionWindow.focus();
}

// IPC Handlers
ipcMain.handle('get-config', () => {
  return config.getAll();
});

ipcMain.handle('set-config', (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
  config.set(key as keyof ReturnType<typeof config.getAll>, value as never);
  return true;
});

ipcMain.handle('capture-region', async (_event: IpcMainInvokeEvent, region: CaptureRegion) => {
  try {
    const imageBuffer = await captureRegion(region);
    return imageBuffer;
  } catch (error) {
    console.error('Capture error:', error);
    throw error;
  }
});

ipcMain.handle('extract-text', async (_event: IpcMainInvokeEvent, imageBuffer: Buffer) => {
  try {
    const text = await extractText(imageBuffer, config.get('ocrLang'));
    return text;
  } catch (error) {
    console.error('OCR error:', error);
    throw error;
  }
});

ipcMain.handle('translate-text', async (_event: IpcMainInvokeEvent, text: string) => {
  try {
    const apiKey = config.get('deeplApiKey');
    if (!apiKey) {
      throw new Error('DeepL API key is not set');
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

interface ProcessScreenshotResult {
  originalText: string;
  translatedText: string;
  error?: string;
}

ipcMain.handle(
  'process-screenshot',
  async (_event: IpcMainInvokeEvent, region: CaptureRegion): Promise<ProcessScreenshotResult> => {
    try {
      // 1. Capture screenshot
      const imageBuffer = await captureRegion(region);

      // 2. OCR processing
      const extractedText = await extractText(imageBuffer, config.get('ocrLang'));

      if (!extractedText || extractedText.trim() === '') {
        throw new Error('No text detected');
      }

      // 3. Translation processing
      const apiKey = config.get('deeplApiKey');
      if (!apiKey) {
        return {
          originalText: extractedText,
          translatedText: '[DeepL API key is not set]',
          error: 'API_KEY_MISSING',
        };
      }

      const translatedText = await translate(
        extractedText,
        config.get('targetLang'),
        config.get('sourceLang'),
        apiKey
      );

      // 4. Save to history
      if (config.get('saveHistory')) {
        const history = config.get('history') || [];
        const newItem: HistoryItem = {
          id: Date.now(),
          originalText: extractedText,
          translatedText: translatedText,
          timestamp: new Date().toISOString(),
        };
        history.unshift(newItem);

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
  }
);

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

ipcMain.handle(
  'show-result-window',
  (_event: IpcMainInvokeEvent, result: ProcessScreenshotResult) => {
    mainWindow?.show();
    mainWindow?.webContents.send('show-translation-result', result);
  }
);

// Screen Recording IPC Handlers
ipcMain.handle('get-screen-sources', async (): Promise<ScreenSource[]> => {
  try {
    return await getScreenSources();
  } catch (error) {
    console.error('Get screen sources error:', error);
    throw error;
  }
});

ipcMain.handle(
  'save-recording',
  async (_event: IpcMainInvokeEvent, buffer: ArrayBuffer): Promise<string | null> => {
    try {
      const nodeBuffer = Buffer.from(buffer);
      return await saveRecording(nodeBuffer);
    } catch (error) {
      console.error('Save recording error:', error);
      throw error;
    }
  }
);

// Application startup
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
