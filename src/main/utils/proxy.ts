/**
 * Proxy Utilities
 *
 * Shared proxy configuration for all Git services (GitHub, GitLab, Import)
 * Supports custom proxy URLs and system proxy settings
 */

import { logger } from './Logger';
import type { ProxyConfig } from '../../shared/types';

// Proxy agents loaded via require to avoid ESM module resolution issues
let HttpsProxyAgent: any = null;
let HttpProxyAgent: any = null;
let proxyAgentsLoaded = false;
let proxyAgentsWarningLogged = false;

// System proxy settings cached from Windows registry
let cachedSystemProxySettings: { httpProxy?: string; httpsProxy?: string } | null = null;
let systemProxyLoadAttempted = false;

// Proxy configuration from settings
let proxySettings: ProxyConfig | null = null;

// Lazy load proxy agents (only when needed)
function loadProxyAgents(): void {
  if (proxyAgentsLoaded) return;

  proxyAgentsLoaded = true;
  let loaded = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpsProxyAgent = require('https-proxy-agent');
    loaded = true;
  } catch {
    // Module not available
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    HttpProxyAgent = require('http-proxy-agent');
    loaded = true;
  } catch {
    // Module not available
  }

  // Only log warning once if proxy agents are needed but not available
  if (!loaded && !proxyAgentsWarningLogged) {
    proxyAgentsWarningLogged = true;
    logger.warn('Proxy agents not available. Proxy functionality will be disabled.', 'ProxyUtils');
  }
}

/**
 * Load system proxy settings from Windows registry
 * This uses the get-proxy-settings package to read actual system proxy configuration
 */
async function loadSystemProxySettings(): Promise<void> {
  if (systemProxyLoadAttempted) return;
  systemProxyLoadAttempted = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getProxySettings } = require('get-proxy-settings');
    const settings = await getProxySettings();

    if (settings?.https) {
      cachedSystemProxySettings = {
        httpsProxy: `http://${settings.https.host}:${settings.https.port}`,
        httpProxy: settings.http ? `http://${settings.http.host}:${settings.http.port}` : undefined,
      };
      logger.info('Loaded system proxy settings from Windows registry', 'ProxyUtils', {
        httpsProxy: cachedSystemProxySettings.httpsProxy,
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    } else if (settings?.http) {
      cachedSystemProxySettings = {
        httpProxy: `http://${settings.http.host}:${settings.http.port}`,
      };
      logger.info('Loaded HTTP system proxy settings from Windows registry', 'ProxyUtils', {
        httpProxy: cachedSystemProxySettings.httpProxy,
      });
    }
  } catch (error) {
    logger.warn('Failed to load system proxy settings from Windows registry', 'ProxyUtils', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Set proxy configuration from settings
 */
export function setProxyConfig(config: ProxyConfig | undefined): void {
  proxySettings = config || null;
  logger.debug('Proxy configuration updated', 'ProxyUtils', { config });

  // Reset cached system proxy when settings change
  if (config?.enabled && config?.type === 'system') {
    // Clear cache to force reload
    cachedSystemProxySettings = null;
    systemProxyLoadAttempted = false;
    // Immediately preload system proxy settings (don't wait for first request)
    loadSystemProxySettings().catch(() => {});
  }
}

/**
 * Get current proxy settings
 */
export function getProxySettings(): ProxyConfig | null {
  return proxySettings;
}

/**
 * Get proxy agent from settings or system environment variables
 * Priority: 1. Custom proxy URL from settings 2. System proxy (if enabled) 3. No proxy
 */
export function getProxyAgent(url: string): any {
  // If proxy is not enabled, return undefined immediately (don't load proxy agents)
  if (!proxySettings?.enabled) {
    return undefined;
  }

  // Only load proxy agents when proxy is actually enabled
  loadProxyAgents();

  const parsedUrl = new URL(url);
  const isHttps = parsedUrl.protocol === 'https:';

  // Priority 1: Custom proxy URL
  if (proxySettings.type === 'custom' && proxySettings.customUrl) {
    logger.debug(`Using custom proxy for ${url}`, 'ProxyUtils', { proxyUrl: proxySettings.customUrl });
    try {
      if (isHttps && HttpsProxyAgent) {
        return new HttpsProxyAgent(proxySettings.customUrl);
      } else if (!isHttps && HttpProxyAgent) {
        return new HttpProxyAgent(proxySettings.customUrl);
      }
    } catch (error) {
      logger.warn('Failed to create proxy agent from custom URL', 'ProxyUtils', error);
    }
    return undefined;
  }

  // Priority 2: System proxy - check cached Windows registry settings first, then fallback to env vars
  if (proxySettings.type === 'system') {
    // First check cached Windows registry proxy settings
    if (cachedSystemProxySettings) {
      const proxyUrl = isHttps
        ? cachedSystemProxySettings.httpsProxy
        : cachedSystemProxySettings.httpProxy;

      if (proxyUrl) {
        logger.debug(`Using Windows system proxy for ${url}`, 'ProxyUtils', { proxyUrl });
        try {
          if (isHttps && HttpsProxyAgent) {
            return new HttpsProxyAgent(proxyUrl);
          } else if (!isHttps && HttpProxyAgent) {
            return new HttpProxyAgent(proxyUrl);
          }
        } catch (error) {
          logger.warn('Failed to create proxy agent from Windows system proxy', 'ProxyUtils', error);
        }
      }
    }

    // Fallback to environment variables (for non-Windows or if registry read failed)
    const envProxyUrl = isHttps
      ? (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)
      : (process.env.HTTP_PROXY || process.env.http_proxy);

    if (envProxyUrl) {
      logger.debug(`Using environment proxy for ${url}`, 'ProxyUtils', { proxyUrl: envProxyUrl });
      try {
        if (isHttps && HttpsProxyAgent) {
          return new HttpsProxyAgent(envProxyUrl);
        } else if (!isHttps && HttpProxyAgent) {
          return new HttpProxyAgent(envProxyUrl);
        }
      } catch (error) {
        logger.warn('Failed to create proxy agent from environment proxy', 'ProxyUtils', error);
      }
    }

    // If no proxy found and haven't attempted to load from Windows registry yet, try to load it
    if (!cachedSystemProxySettings && !systemProxyLoadAttempted) {
      // Trigger async load for next time, but don't block current request
      loadSystemProxySettings().catch(() => {});
      logger.debug('Initiated system proxy settings load for next request', 'ProxyUtils');
    }
  }

  return undefined;
}

/**
 * Fetch with proxy support and timeout
 * This is a shared utility for all services that need to make HTTP requests
 */
export async function fetchWithProxy(url: string, options: any = {}): Promise<any> {
  // Add default timeout of 30 seconds if not specified
  const timeout = options.timeout || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Get proxy agent if configured, otherwise use a fresh agent to avoid connection pooling issues
    let agent = getProxyAgent(url);

    // If no proxy agent, create a simple agent that disables connection pooling
    // This helps prevent ECONNRESET errors from connection reuse
    if (!agent && url.startsWith('https://')) {
      const https = require('https');
      agent = new https.Agent({
        keepAlive: false, // Disable keep-alive to prevent connection reuse issues
        timeout: 30000,
      });
    }

    // Use node-fetch if available, otherwise use global fetch
    const fetchFn = options.fetchFn || require('node-fetch').default || fetch;

    const response = await fetchFn(url, {
      ...options,
      agent,
      signal: options.signal || controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
