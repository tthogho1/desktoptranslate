import { screen, desktopCapturer } from 'electron';

export type CaptureRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export async function captureRegion(region: CaptureRegion): Promise<Buffer> {
  // Get the primary display's size and bounds
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.size;

  // Get the screen source
  const sources = await desktopCapturer.getSources({ types: ['screen'] });
  const screenSource = sources[0];
  if (!screenSource) throw new Error('No screen source found');

  // Get the image as a buffer
  const image = screenSource.thumbnail.crop({
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
  });
  return image.toPNG();
}
