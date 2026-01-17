const screenshot = require('screenshot-desktop');
const Jimp = require('jimp');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * 画面全体をキャプチャしてバッファを返す
 */
async function captureFullScreen() {
  try {
    const imgBuffer = await screenshot({ format: 'png' });
    return imgBuffer;
  } catch (error) {
    console.error('Full screen capture error:', error);
    throw error;
  }
}

/**
 * 指定された領域をキャプチャしてバッファを返す
 * @param {Object} region - { x, y, width, height }
 * @returns {Promise<Buffer>} - PNG画像バッファ
 */
async function captureRegion(region) {
  try {
    const { x, y, width, height } = region;

    // 画面全体をキャプチャ
    const fullScreenBuffer = await screenshot({ format: 'png' });

    // Jimpで画像を読み込んでクロップ
    const image = await Jimp.read(fullScreenBuffer);

    // 座標が画像範囲内であることを確認
    const cropX = Math.max(0, Math.min(x, image.bitmap.width - 1));
    const cropY = Math.max(0, Math.min(y, image.bitmap.height - 1));
    const cropWidth = Math.min(width, image.bitmap.width - cropX);
    const cropHeight = Math.min(height, image.bitmap.height - cropY);

    if (cropWidth <= 0 || cropHeight <= 0) {
      throw new Error('Invalid capture region');
    }

    // 指定領域をクロップ
    image.crop(cropX, cropY, cropWidth, cropHeight);

    // OCR精度向上のための画像処理
    image.greyscale(); // グレースケール化
    image.contrast(0.3); // コントラスト調整

    // バッファとして取得
    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);

    return buffer;
  } catch (error) {
    console.error('Region capture error:', error);
    throw error;
  }
}

/**
 * キャプチャした画像を一時ファイルとして保存
 * @param {Buffer} buffer - 画像バッファ
 * @returns {Promise<string>} - 保存したファイルパス
 */
async function saveTempImage(buffer) {
  const tempDir = os.tmpdir();
  const fileName = `screenshot_${Date.now()}.png`;
  const filePath = path.join(tempDir, fileName);

  await fs.promises.writeFile(filePath, buffer);
  return filePath;
}

/**
 * 一時ファイルを削除
 * @param {string} filePath - 削除するファイルパス
 */
async function deleteTempImage(filePath) {
  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    console.error('Failed to delete temp image:', error);
  }
}

module.exports = {
  captureFullScreen,
  captureRegion,
  saveTempImage,
  deleteTempImage,
};
