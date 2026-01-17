import { desktopCapturer, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

export interface ScreenSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
}

// Get available screen sources for recording
export async function getScreenSources(): Promise<ScreenSource[]> {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 150, height: 150 },
  });

  return sources.map(source => ({
    id: source.id,
    name: source.name,
    thumbnailDataUrl: source.thumbnail.toDataURL(),
  }));
}

// Save recorded video buffer to file
export async function saveRecording(
  buffer: Buffer,
  defaultFileName?: string
): Promise<string | null> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = defaultFileName || `recording-${timestamp}.webm`;

  const result = await dialog.showSaveDialog({
    title: 'Save Recording',
    defaultPath: path.join(require('os').homedir(), 'Videos', fileName),
    filters: [
      { name: 'WebM Video', extensions: ['webm'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  fs.writeFileSync(result.filePath, buffer);
  return result.filePath;
}
