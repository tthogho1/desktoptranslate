import Tesseract, { Worker } from 'tesseract.js';

let worker: Worker | null = null;

interface OcrLanguage {
  code: string;
  name: string;
}

/**
 * Tesseract Workerを初期化
 * @param lang - 言語コード (例: 'jpn+eng')
 */
export async function initWorker(lang: string = 'jpn+eng'): Promise<Worker> {
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
 * @param image - 画像バッファまたはパス
 * @param lang - 言語コード (例: 'jpn+eng')
 * @returns 抽出されたテキスト
 */
export async function extractText(
  image: Buffer | string,
  lang: string = 'jpn+eng'
): Promise<string> {
  try {
    // Workerがない場合は初期化
    if (!worker) {
      await initWorker(lang);
    }

    console.log('Starting OCR processing...');

    const { data } = await worker!.recognize(image);
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
 * @param text - 生のテキスト
 * @returns 処理済みテキスト
 */
export function postProcessText(text: string): string {
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
 * @param image - 画像バッファまたはパス
 * @param lang - 言語コード
 * @returns 抽出されたテキスト
 */
export async function extractTextOneShot(
  image: Buffer | string,
  lang: string = 'jpn+eng'
): Promise<string> {
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
export async function terminateWorker(): Promise<void> {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}

/**
 * サポートされている言語を取得
 */
export function getSupportedLanguages(): OcrLanguage[] {
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

export type { OcrLanguage };
