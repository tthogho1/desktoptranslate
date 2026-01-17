const Store = require('electron-store');

const schema = {
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
  },
  theme: {
    type: 'string',
    default: 'system',
  },
};

const store = new Store({ schema });

module.exports = {
  get: key => store.get(key),
  set: (key, value) => store.set(key, value),
  getAll: () => store.store,
  reset: key => store.reset(key),
  resetAll: () => store.clear(),
  has: key => store.has(key),
  delete: key => store.delete(key),
  path: store.path,
};
