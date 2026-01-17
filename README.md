# Screenshot Translator

# Screenshot Translator

A cross-platform Electron desktop app for capturing, translating, and recording your screen.

## Features

- **Hotkey**: Quickly start translation with a customizable shortcut (default: Ctrl+Shift+T).
- **Screenshot OCR & Translation**: Select any region of your screen, extract text using OCR, and translate it using DeepL.
- **History**: View and manage your translation history.
- **Settings**: Configure DeepL API key, OCR language, translation languages, and more.
- **Screen Recording**: Record your desktop or application windows as video files (WebM).

## Requirements

- Node.js (v16 or later recommended)
- npm
- DeepL API Key (required for translation)

## Installation

1. Clone this repository:
   ```sh
   git clone <your-repo-url>
   cd desktoptranslate
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the app:
   ```sh
   npm start
   ```

## Usage

- **Translation**: Press `Ctrl+Shift+T` (or your configured hotkey), select a region, and view the translation in the main window.
- **Screen Recording**: Go to the "Record" tab, select a screen/window, and use the Start/Stop buttons to record. Save the video as a WebM file.
- **Settings**: Enter your DeepL API key and adjust language preferences in the "Settings" tab.
- **History**: View or clear your translation history in the "History" tab.

## Configuration

- **DeepL API Key**: Required for translation. Get your key from [DeepL Pro API](https://www.deepl.com/pro-api).
- **OCR Language**: Choose the language(s) for text extraction (e.g., Japanese + English).
- **Translation Languages**: Set source and target languages for translation.
- **Save History**: Enable or disable saving translation history.

## File Structure

- `src/main/` - Main process (Electron app logic, IPC, capture, OCR, translation, recording)
- `src/renderer/` - Renderer process (UI logic, preload script)
- `renderer/` - HTML and static assets
- `assets/` - App icons and images

## License

MIT License

---

**Note:** This project is not affiliated with DeepL. You must provide your own DeepL API key for translation functionality.

## ライセンス

MIT

```

```
