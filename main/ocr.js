const Tesseract = require('tesseract.js');
const path = require('path');

let worker = null;

/**
 * Tesseract Workerを初期化
 * @param {string} lang - 言語コード (例: 'jpn+eng')
 */
async function initWorker(lang = 'jpn+eng') {
  if (worker) {
    await worker.terminate();
  }

  worker = await Tesseract.createWorker(lang, 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  return worker;
}

/**
 * 画像からテキストを抽出
 * @param {Buffer|string} image - 画像バッファまたはパス
 * @param {string} lang - 言語コード (例: 'jpn+eng')
 * @returns {Promise<string>} - 抽出されたテキスト
 */
async function extractText(image, lang = 'jpn+eng') {
  try {
    // Workerがない場合は初期化
    if (!worker) {
      await initWorker(lang);
    }

    console.log('Starting OCR processing...');

    const { data } = await worker.recognize(image);
    const extractedText = data.text.trim();

    console.log('OCR completed. Extracted text length:', extractedText.length);

    // テキストの後処理（改行の正規化など）
    const processedText = postProcessText(extractedText);

    return processedText;
  } catch (error) {
    console.error('OCR extraction error:', error);
    throw error;
  }
}

/**
 * 抽出されたテキストの後処理
 * @param {string} text - 生のテキスト
 * @returns {string} - 処理済みテキスト
 */
function postProcessText(text) {
  if (!text) return '';

  return (
    text
      // 複数の空白を1つに
      .replace(/[ \t]+/g, ' ')
      // 複数の改行を1つに
      .replace(/\n{3,}/g, '\n\n')
      // 行頭・行末の空白を削除
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      .trim()
  );
}

/**
 * 特定の言語でOCRを実行（ワンショット）
 * @param {Buffer|string} image - 画像バッファまたはパス
 * @param {string} lang - 言語コード
 * @returns {Promise<string>} - 抽出されたテキスト
 */
async function extractTextOneShot(image, lang = 'jpn+eng') {
  try {
    const result = await Tesseract.recognize(image, lang, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    return postProcessText(result.data.text);
  } catch (error) {
    console.error('One-shot OCR error:', error);
    throw error;
  }
}

/**
 * Workerを終了
 */
async function terminateWorker() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * サポートされている言語を取得
 */
function getSupportedLanguages() {
  return [
    { code: 'eng', name: 'English' },
    { code: 'jpn', name: '日本語' },
    { code: 'chi_sim', name: '中国語（簡体）' },
    { code: 'chi_tra', name: '中国語（繁体）' },
    { code: 'kor', name: '韓国語' },
    { code: 'fra', name: 'フランス語' },
    { code: 'deu', name: 'ドイツ語' },
    { code: 'spa', name: 'スペイン語' },
    { code: 'ita', name: 'イタリア語' },
    { code: 'por', name: 'ポルトガル語' },
    { code: 'rus', name: 'ロシア語' },
  ];
}

module.exports = {
  initWorker,
  extractText,
  extractTextOneShot,
  terminateWorker,
  getSupportedLanguages,
  postProcessText,
};
