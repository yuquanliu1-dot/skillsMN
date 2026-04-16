/**
 * ShikiService - Singleton Shiki highlighter with LRU cache
 *
 * Provides a shared highlighter instance with:
 * - LRU cache (max 200 entries)
 * - Dual theme support (GitHub Light + GitHub Dark)
 * - Preloaded common languages on init
 */

import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki';

// ---------------------------------------------------------------------------
// LRU Cache
// ---------------------------------------------------------------------------

class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get size(): number {
    return this.cache.size;
  }

  clear(): void {
    this.cache.clear();
  }
}

// ---------------------------------------------------------------------------
// ShikiService Singleton
// ---------------------------------------------------------------------------

const LIGHT_THEME = 'github-light';
const DARK_THEME = 'github-dark';

const PRELOAD_LANGUAGES: BundledLanguage[] = [
  'markdown',
  'javascript',
  'typescript',
  'python',
  'bash',
  'json',
  'html',
  'css',
  'tsx',
  'jsx',
  'yaml',
  'rust',
  'go',
  'sql',
];

interface CacheEntry {
  light: string;
  dark: string;
}

class ShikiService {
  private highlighter: Highlighter | null = null;
  private cache = new LRUCache<string, CacheEntry>(200);
  private initPromise: Promise<void> | null = null;

  /** Initialize the highlighter (idempotent, returns existing promise if already called) */
  async init(): Promise<void> {
    if (this.highlighter) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.highlighter = await createHighlighter({
        themes: [LIGHT_THEME, DARK_THEME],
        langs: PRELOAD_LANGUAGES,
      });
    })();

    return this.initPromise;
  }

  /** Highlight code with dual themes, returns { light, dark } HTML strings */
  async highlight(code: string, language: string): Promise<CacheEntry> {
    // Normalize language
    const lang = this.normalizeLanguage(language);

    // Check cache
    const cacheKey = `${lang}:${code}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    // Ensure highlighter is ready
    await this.init();
    if (!this.highlighter) {
      throw new Error('Shiki highlighter failed to initialize');
    }

    // Load language on demand if not already loaded
    const loadedLangs = this.highlighter.getLoadedLanguages();
    if (!loadedLangs.includes(lang as BundledLanguage)) {
      try {
        await this.highlighter.loadLanguage(lang as BundledLanguage);
      } catch {
        // Fall back to plain text if language not supported
        return this.highlightAsText(code);
      }
    }

    const light = this.highlighter.codeToHtml(code, {
      lang: lang as BundledLanguage,
      theme: LIGHT_THEME,
    });

    const dark = this.highlighter.codeToHtml(code, {
      lang: lang as BundledLanguage,
      theme: DARK_THEME,
    });

    const entry = { light, dark };
    this.cache.set(cacheKey, entry);
    return entry;
  }

  /** Check if a language is supported */
  async isLanguageSupported(language: string): Promise<boolean> {
    await this.init();
    if (!this.highlighter) return false;
    const lang = this.normalizeLanguage(language);
    const loadedLangs = this.highlighter.getLoadedLanguages();
    if (loadedLangs.includes(lang as BundledLanguage)) return true;
    try {
      const bundledLangs = this.highlighter.getLoadedLanguages();
      return bundledLangs.includes(lang as BundledLanguage);
    } catch {
      return false;
    }
  }

  private highlightAsText(code: string): CacheEntry {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const html = `<pre class="shiki"><code>${escaped}</code></pre>`;
    return { light: html, dark: html };
  }

  private normalizeLanguage(lang: string): string {
    const aliases: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      py: 'python',
      rb: 'ruby',
      sh: 'bash',
      shell: 'bash',
      zsh: 'bash',
      yml: 'yaml',
      md: 'markdown',
      txt: 'text',
      conf: 'text',
      dockerfile: 'docker',
    };
    return aliases[lang.toLowerCase()] || lang.toLowerCase();
  }

  /** Clear the cache */
  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
export const shikiService = new ShikiService();
export default shikiService;
