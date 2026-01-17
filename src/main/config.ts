import Store from 'electron-store';

interface ConfigSchema {
  hotkey: string;
  deeplApiKey: string;
  ocrLang: string;
  targetLang: string;
  sourceLang: string;
  saveHistory: boolean;
  maxHistoryItems: number;
  history: HistoryItem[];
  windowBounds: WindowBounds;
  theme: string;
}

interface HistoryItem {
  id: number;
  originalText: string;
  translatedText: string;
  timestamp: string;
}

interface WindowBounds {
  width: number;
  height: number;
}

const schema: Store.Schema<ConfigSchema> = {
  hotkey: {
    type: 'string',
    default: 'CommandOrControl+Shift+T',
  },
  deeplApiKey: {
    type: 'string',
    default: '',
  },
  ocrLang: {
    type: 'string',
    default: 'jpn+eng',
  },
  targetLang: {
    type: 'string',
    default: 'JA',
  },
  sourceLang: {
    type: 'string',
    default: 'EN',
  },
  saveHistory: {
    type: 'boolean',
    default: true,
  },
  maxHistoryItems: {
    type: 'number',
    default: 100,
  },
  history: {
    type: 'array',
    default: [],
  },
  windowBounds: {
    type: 'object',
    default: {
      width: 800,
      height: 600,
    },
    properties: {
      width: { type: 'number' },
      height: { type: 'number' },
    },
  },
  theme: {
    type: 'string',
    default: 'system',
  },
};

const store = new Store<ConfigSchema>({ schema });

export const config = {
  get: <K extends keyof ConfigSchema>(key: K): ConfigSchema[K] => store.get(key),
  set: <K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void =>
    store.set(key, value),
  getAll: (): ConfigSchema => store.store,
  reset: <K extends keyof ConfigSchema>(key: K): void => store.reset(key),
  resetAll: (): void => store.clear(),
  has: (key: keyof ConfigSchema): boolean => store.has(key),
  delete: <K extends keyof ConfigSchema>(key: K): void => store.delete(key),
  path: store.path,
};

export type { ConfigSchema, HistoryItem, WindowBounds };
