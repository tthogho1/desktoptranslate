import axios from 'axios';

const DEEPL_API_FREE_URL = 'https://api-free.deepl.com/v2/translate';
const DEEPL_API_PRO_URL = 'https://api.deepl.com/v2/translate';

interface TranslationResponse {
  translations: {
    text: string;
    detected_source_language?: string;
  }[];
}

interface Language {
  language: string;
  name: string;
}

interface UsageInfo {
  character_count: number;
  character_limit: number;
}

/**
 * DeepL APIを使用してテキストを翻訳
 * @param text - 翻訳するテキスト
 * @param targetLang - 翻訳先言語コード
 * @param sourceLang - 翻訳元言語コード (省略可能)
 * @param apiKey - DeepL APIキー
 * @returns 翻訳されたテキスト
 */
export async function translate(
  text: string,
  targetLang: string = 'JA',
  sourceLang: string | null = null,
  apiKey: string
): Promise<string> {
  if (!text || text.trim() === '') {
    throw new Error('翻訳するテキストが空です');
  }

  if (!apiKey) {
    throw new Error('DeepL APIキーが設定されていません');
  }

  // APIキーからFree/Proを判定
  const apiUrl = apiKey.endsWith(':fx') ? DEEPL_API_FREE_URL : DEEPL_API_PRO_URL;

  try {
    const params = new URLSearchParams();
    params.append('auth_key', apiKey);
    params.append('text', text);
    params.append('target_lang', targetLang);

    if (sourceLang) {
      params.append('source_lang', sourceLang);
    }

    console.log(`Translating to ${targetLang}...`);

    const response = await axios.post<TranslationResponse>(apiUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 30000,
    });

    if (response.data && response.data.translations && response.data.translations.length > 0) {
      const translatedText = response.data.translations[0].text;
      console.log('Translation completed successfully');
      return translatedText;
    } else {
      throw new Error('翻訳結果が取得できませんでした');
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      switch (status) {
        case 403:
          throw new Error('APIキーが無効です');
        case 413:
          throw new Error('テキストが長すぎます');
        case 429:
          throw new Error('リクエスト制限に達しました。しばらく待ってから再試行してください');
        case 456:
          throw new Error('翻訳の割り当て量を超過しました');
        case 503:
          throw new Error('DeepLサービスが一時的に利用できません');
        default:
          throw new Error(
            `翻訳エラー (${status}): ${(error.response.data as { message?: string })?.message || '不明なエラー'}`
          );
      }
    }
    throw error;
  }
}

/**
 * サポートされている言語一覧を取得
 * @param apiKey - DeepL APIキー
 * @returns 言語リスト
 */
export async function getSupportedLanguages(apiKey: string): Promise<Language[]> {
  if (!apiKey) {
    // APIキーがない場合はデフォルトの言語リストを返す
    return getDefaultLanguages();
  }

  const apiUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/languages'
    : 'https://api.deepl.com/v2/languages';

  try {
    const response = await axios.get<Language[]>(apiUrl, {
      params: { auth_key: apiKey },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch languages:', error);
    return getDefaultLanguages();
  }
}

/**
 * デフォルトの言語リストを返す
 */
export function getDefaultLanguages(): Language[] {
  return [
    { language: 'JA', name: '日本語' },
    { language: 'EN', name: 'English' },
    { language: 'EN-US', name: 'English (US)' },
    { language: 'EN-GB', name: 'English (UK)' },
    { language: 'DE', name: 'Deutsch' },
    { language: 'FR', name: 'Français' },
    { language: 'ES', name: 'Español' },
    { language: 'IT', name: 'Italiano' },
    { language: 'PT', name: 'Português' },
    { language: 'PT-BR', name: 'Português (Brasil)' },
    { language: 'NL', name: 'Nederlands' },
    { language: 'PL', name: 'Polski' },
    { language: 'RU', name: 'Русский' },
    { language: 'ZH', name: '中文' },
    { language: 'KO', name: '한국어' },
  ];
}

/**
 * API使用量を取得
 * @param apiKey - DeepL APIキー
 * @returns 使用量情報
 */
export async function getUsage(apiKey: string): Promise<UsageInfo> {
  if (!apiKey) {
    throw new Error('APIキーが設定されていません');
  }

  const apiUrl = apiKey.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2/usage'
    : 'https://api.deepl.com/v2/usage';

  try {
    const response = await axios.get<UsageInfo>(apiUrl, {
      params: { auth_key: apiKey },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get usage:', error);
    throw error;
  }
}

export type { TranslationResponse, Language, UsageInfo };
