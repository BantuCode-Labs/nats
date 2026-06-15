import { getSession } from "@/lib/auth/auth";
import { getAIConfig } from "@/lib/ai/config";
import { OpenAIProvider } from "@/lib/ai/providers/openai";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter";

// ============================================================================
// Types
// ============================================================================

export type StatusCallback = (status: string) => void;

// ============================================================================
// HTML Sanitization
// ============================================================================

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// Rate Limiting
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function getRateLimitKey(userId: string): string {
  return `sku_search:${userId}`;
}

export function checkRateLimit(userId: string): {
  allowed: boolean;
  remaining: number;
} {
  const key = getRateLimitKey(userId);
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

// ============================================================================
// Activity Logging
// ============================================================================

interface SearchLogEntry {
  userId: string;
  userName: string;
  sku: string;
  success: boolean;
  resultCount: number;
  source: string;
  timestamp: string;
  error?: string;
  durationMs: number;
}

export const searchLogs: SearchLogEntry[] = [];

function logSearch(entry: SearchLogEntry): void {
  searchLogs.push(entry);
  if (searchLogs.length > 1000) {
    searchLogs.splice(0, searchLogs.length - 1000);
  }
  console.log(
    `[SKU Search] User: ${entry.userName} | SKU: ${entry.sku} | Source: ${entry.source} | Success: ${entry.success} | Results: ${entry.resultCount} | Duration: ${entry.durationMs}ms${entry.error ? ` | Error: ${entry.error}` : ""}`,
  );
}

export interface SkuSearchMetadata {
  name: string;
  description: string;
  category: string;
  price: string;
  images: string[];
  specifications: Record<string, string>;
  sourceUrl: string;
  sourceTitle: string;
}

export interface SkuSearchResult {
  success: boolean;
  data?: SkuSearchMetadata[];
  error?: string;
  rateLimit?: { remaining: number };
}

// ============================================================================
// Image Validation
// ============================================================================

const SUPPORTED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".svg",
];

export function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    const pathname = parsed.pathname.toLowerCase();
    const lastDot = pathname.lastIndexOf(".");
    if (lastDot === -1) return true;
    const ext = pathname.substring(lastDot);
    return SUPPORTED_IMAGE_EXTENSIONS.some((e) => ext.startsWith(e));
  } catch {
    return false;
  }
}

export function filterValidImages(images: string[]): string[] {
  return images.filter(isValidImageUrl);
}

// ============================================================================
// Lightpanda Browser Engine
// ============================================================================

let lightpandaProc: any = null;
let lightpandaReady = false;

async function ensureLightpanda(): Promise<boolean> {
  if (lightpandaReady) return true;
  try {
    const { lightpanda } = await import("@lightpanda/browser");
    lightpandaProc = await lightpanda.serve({
      host: "127.0.0.1",
      port: 9222,
    });

    // Run headless in background: suppress all process output and detach
    if (lightpandaProc.stdout) lightpandaProc.stdout.destroy();
    if (lightpandaProc.stderr) lightpandaProc.stderr.destroy();
    lightpandaProc.unref();

    lightpandaReady = true;
    return true;
  } catch (error) {
    console.error("[SKU Search] Failed to start Lightpanda:", error);
    return false;
  }
}

function cleanupLightpanda(): void {
  if (lightpandaProc) {
    try {
      lightpandaProc.stdout?.destroy();
      lightpandaProc.stderr?.destroy();
      lightpandaProc.kill();
    } catch {}
    lightpandaProc = null;
    lightpandaReady = false;
  }
}

// Auto-cleanup on process exit
if (typeof process !== "undefined") {
  process.on("exit", cleanupLightpanda);
  process.on("SIGINT", cleanupLightpanda);
  process.on("SIGTERM", cleanupLightpanda);
}

// ============================================================================
// Lightpanda Page Fetching
// ============================================================================

async function fetchPageWithLightpanda(url: string): Promise<string> {
  try {
    const ready = await ensureLightpanda();
    if (!ready) return "";

    const { lightpanda } = await import("@lightpanda/browser");
    const result = await lightpanda.fetch(url, {
      dump: true,
    });

    const raw =
      typeof result === "string"
        ? result
        : result && typeof result === "object" && "content" in result
          ? String((result as any).content)
          : "";
    return sanitizeHtml(raw).substring(0, 4000);
  } catch (error) {
    console.error(`[SKU Search] Lightpanda fetch failed for ${url}:`, error);
    return "";
  }
}

async function fetchPageInteractive(url: string): Promise<string> {
  try {
    const ready = await ensureLightpanda();
    if (!ready) return "";

    const versionRes = await fetch("http://127.0.0.1:9222/json/version");
    const versionData = await versionRes.json();

    const puppeteer = await import("puppeteer-core");
    const browser = await puppeteer.default.connect({
      browserWSEndpoint: versionData.webSocketDebuggerUrl,
      defaultViewport: { width: 1280, height: 720 },
    });

    const context = await browser.createBrowserContext();
    const page = await context.newPage({ background: true });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });

    // Wait a bit for dynamic content
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const content = await page.evaluate(() => {
      return (
        document.body?.innerHTML || document.documentElement?.innerHTML || ""
      );
    });

    await page.close();
    await context.close();
    await browser.disconnect();

    return sanitizeHtml(content).substring(0, 4000);
  } catch (error) {
    console.error(`[SKU Search] Interactive fetch failed for ${url}:`, error);
    return "";
  }
}

// ============================================================================
// LLM Client
// ============================================================================

async function callLLM(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  const config = await getAIConfig();
  if (!config.apiKey) throw new Error("No API key configured");

  let provider;
  if (config.provider === "openrouter") {
    provider = new OpenRouterProvider(config.apiKey);
  } else if (config.provider === "custom" && config.customEndpoint) {
    provider = new OpenAIProvider(config.apiKey, config.customEndpoint);
  } else {
    provider = new OpenAIProvider(config.apiKey);
  }

  const response = await provider.chatCompletion({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    config: {
      model: config.model,
      temperature: 0.1,
      maxTokens: 4000,
    },
  });

  if (!response.content) throw new Error("Empty LLM response");
  return response.content;
}

function parseJSON<T>(text: string): T | null {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try extracting a JSON array from surrounding text
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // Try recovering a truncated array by closing at last complete object
        const lastBrace = match[0].lastIndexOf("}");
        if (lastBrace !== -1) {
          try {
            return JSON.parse(match[0].substring(0, lastBrace + 1) + "]");
          } catch {
            // All attempts failed
          }
        }
      }
    }
    return null;
  }
}

// ============================================================================
// Agentic AI Product Search
// ============================================================================

const AGENT_EXTRACTION_PROMPT = `You are a product data extraction agent. You have been given web page content from search results and product pages related to a product SKU/barcode.

Your task is to:
1. Identify which pages contain actual product information
2. Extract structured product metadata from the best sources
3. Cross-reference data across sources for accuracy

Return ONLY a valid JSON array (no markdown, no backticks). Each object should have this exact structure:
{
  "name": "product name",
  "description": "brief product description",
  "category": "product category",
  "price": "price with currency if found, empty string if not",
  "images": ["array of absolute image URLs (http/https only)"],
  "specifications": {"key": "value pairs of technical specs"},
  "sourceTitle": "the source page title or product name",
  "sourceUrl": "the URL where this product data was found",
  "confidence": "high|medium|low"
}

Rules:
- Prioritize accuracy over completeness - only include data you're confident about
- If multiple products are found, return the most relevant one(s) for the SKU
- Extract all image URLs (absolute URLs only)
- If price is not found, use empty string ""
- Keep specifications concise (max 15 entries)
- Prefer data from authoritative sources (manufacturer sites, major retailers)
- If the content is not about a product, return an empty array []
- Include confidence level based on how well the data matches the queried SKU
- Include sourceUrl from the page where the data was found
- Your response MUST start with [ and end with ] — no explanatory text, no markdown fences`;

function evaluateSearchResults(
  results: { title: string; url: string }[],
): string[] {
  if (results.length === 0) return [];

  const BLOCKED_DOMAINS = [
    "google.com",
    "bing.com",
    "yahoo.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    "linkedin.com",
    "pinterest.com",
    "youtube.com",
    "vimeo.com",
    "reddit.com",
    "quora.com",
    "stackoverflow.com",
    "scribd.com",
    "slideshare.net",
    "medium.com",
    "wikipedia.org",
  ];

  const PRODUCT_DOMAINS = [
    "amazon.",
    "ebay.",
    "walmart.",
    "target.",
    "bestbuy.",
    "costco.",
    "shopify.",
    "etsy.",
    "alibaba.",
    "aliexpress.",
    "go-upc.com",
    "upcitemdb.com",
    "barcodelookup.com",
    "openfoodfacts.org",
  ];

  const filtered = results.filter((r) => {
    try {
      const hostname = new URL(r.url).hostname.toLowerCase();
      return !BLOCKED_DOMAINS.some((d) => hostname.includes(d));
    } catch {
      return false;
    }
  });

  const scored = filtered.map((r) => {
    let score = 0;
    const urlLower = r.url.toLowerCase();
    const titleLower = r.title.toLowerCase();

    if (PRODUCT_DOMAINS.some((d) => urlLower.includes(d))) score += 10;
    if (/\.(com|net|org|co)\//i.test(urlLower) && !urlLower.includes("blog"))
      score += 2;
    if (/product|item|sku|barcode|upc|ean/i.test(urlLower)) score += 5;
    if (/buy|shop|price|store/i.test(urlLower)) score += 3;
    if (/product|item|sku|barcode|upc|ean/i.test(titleLower)) score += 4;
    if (/buy|shop|price|store/i.test(titleLower)) score += 2;

    return { url: r.url, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3).map((s) => s.url);
}

async function extractProductData(
  pageContents: { url: string; content: string }[],
  sku: string,
): Promise<SkuSearchMetadata[]> {
  if (pageContents.length === 0) return [];

  try {
    const contextParts = pageContents.map(
      (p) => `Source URL: ${p.url}\nContent:\n${sanitizeHtml(p.content)}`,
    );

    const response = await callLLM(
      AGENT_EXTRACTION_PROMPT,
      `SKU/Barcode: ${sku}\n\nPage contents from search results:\n\n${contextParts.join("\n\n---\n\n")}`,
    );

    const parsed = parseJSON<any[]>(response);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object" && item.name)
      .slice(0, 5)
      .map((item) => ({
        name: String(item.name || ""),
        description: String(item.description || ""),
        category: String(item.category || ""),
        price: String(item.price || ""),
        images: filterValidImages(
          Array.isArray(item.images) ? item.images.map(String) : [],
        ),
        specifications:
          item.specifications && typeof item.specifications === "object"
            ? Object.fromEntries(
                Object.entries(item.specifications).map(([k, v]) => [
                  String(k),
                  String(v),
                ]),
              )
            : {},
        sourceUrl: String(item.sourceUrl || pageContents[0]?.url || ""),
        sourceTitle: String(item.sourceTitle || item.name || ""),
      }));
  } catch (error) {
    console.error("[SKU Search] Agent extraction failed:", error);
    return [];
  }
}

// ============================================================================
// Search Engine via Lightpanda
// ============================================================================

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

async function searchViaLightpanda(
  query: string,
  retries = 2,
): Promise<SearchResult[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    let browser: any = null;
    let context: any = null;
    let page: any = null;
    try {
      const ready = await ensureLightpanda();
      if (!ready) return [];

      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        console.log(
          `[SKU Search] Retrying Lightpanda search (attempt ${attempt + 1}/${retries + 1})`,
        );
      }

      const versionRes = await fetch("http://127.0.0.1:9222/json/version");
      const versionData = await versionRes.json();

      const puppeteer = await import("puppeteer-core");
      browser = await puppeteer.default.connect({
        browserWSEndpoint: versionData.webSocketDebuggerUrl,
        defaultViewport: { width: 1280, height: 720 },
      });

      context = await browser.createBrowserContext();
      page = await context.newPage({ background: true });

      // Navigate to Google search
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=en`;
      await page.goto(searchUrl, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });

      // Extract search results using DOM selectors
      const results: SearchResult[] = await page.evaluate(() => {
        const items: { title: string; snippet: string; url: string }[] = [];
        const resultElements = Array.from(
          document.querySelectorAll("div.g, div[data-hveid]"),
        );

        for (const el of resultElements) {
          const linkEl = el.querySelector("a[href]");
          const titleEl = el.querySelector("h3");
          const snippetEl = el.querySelector(
            ".VwiC3b, .IsZvec, [data-sncf], span.st",
          );

          if (linkEl && titleEl) {
            const href = (linkEl as HTMLAnchorElement).href;
            if (
              href &&
              !href.includes("google.com") &&
              !href.startsWith("/") &&
              href.startsWith("http")
            ) {
              items.push({
                title: titleEl.textContent?.trim() || "",
                snippet: snippetEl?.textContent?.trim() || "",
                url: href,
              });
            }
          }
        }
        return items.slice(0, 8);
      });

      return results;
    } catch (error) {
      const isLast = attempt === retries;
      if (isLast) {
        console.error("[SKU Search] Lightpanda search failed:", error);
      }
      if (isLast) return [];
    } finally {
      try {
        if (page) await page.close();
      } catch {}
      try {
        if (context) await context.close();
      } catch {}
      try {
        if (browser) await browser.disconnect();
      } catch {}
    }
  }
  return [];
}

// ============================================================================
// Agentic Search Orchestrator
// ============================================================================

async function agenticProductSearch(
  sku: string,
  onStatus?: StatusCallback,
): Promise<SkuSearchMetadata[]> {
  // Step 1: Search via Lightpanda
  onStatus?.("Searching...");
  const allResults = await searchViaLightpanda(sku);

  if (allResults.length === 0) {
    onStatus?.("No search results found...");
    return [];
  }

  // Step 2: Filter and rank results by relevance
  onStatus?.("Ranking search results...");
  const urlsToFetch = evaluateSearchResults(allResults);
  if (urlsToFetch.length === 0) return [];

  // Step 3: Fetch selected pages (parallel)
  onStatus?.(`Fetching ${urlsToFetch.length} product pages...`);
  const fetchPromises = urlsToFetch.map(async (url) => {
    // Try fast fetch first, fall back to interactive
    let content = await fetchPageWithLightpanda(url);
    if (!content || content.length < 200) {
      onStatus?.(`Fetching from ${url.slice(0, 100)}... ${url}`);
      content = await fetchPageInteractive(url);
    }
    return { url, content };
  });

  const allFetchResults = await Promise.all(fetchPromises);
  const pageContents = allFetchResults.filter((p) => p.content.length > 100);

  if (pageContents.length === 0) return [];

  // Step 4: Agent extracts structured product data
  onStatus?.("Extracting product data with AI...");
  const products = await extractProductData(pageContents, sku);
  onStatus?.(`Found ${products.length} products`);

  return products;
}

// ============================================================================
// API-Based Sources (No Browser Needed)
// ============================================================================

async function searchUPCitemdb(sku: string): Promise<SkuSearchMetadata[]> {
  try {
    const response = await fetch(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(sku)}`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (data.code !== "OK" || !data.items || data.items.length === 0) {
      return [];
    }

    return data.items.slice(0, 5).map((item: any) => ({
      name: item.title || item.description || "",
      description: item.description || item.title || "",
      category: item.category || "",
      price: item.highest_recorded_price
        ? `$${item.highest_recorded_price}`
        : item.lowest_recorded_price
          ? `$${item.lowest_recorded_price}`
          : "",
      images: filterValidImages(item.images || []),
      specifications: Object.fromEntries(
        Object.entries(item.attributes || {}).map(([k, v]) => [k, String(v)]),
      ),
      sourceUrl: item.offers?.[0]?.link || "",
      sourceTitle: item.title || "",
    }));
  } catch {
    return [];
  }
}

async function searchOpenFoodFacts(sku: string): Promise<SkuSearchMetadata[]> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(sku)}.json`,
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (!response.ok) return [];

    const data = await response.json();
    if (data.status !== 1 || !data.product) return [];

    const p = data.product;
    const images = [
      p.image_front_url,
      p.image_front_small_url,
      p.image_url,
      ...(p.images || []).map((img: any) => img.url || img.full_size_url),
    ].filter(Boolean);

    const specs: Record<string, string> = {};
    if (p.nutriments) {
      const important = [
        "energy-kcal_100g",
        "fat_100g",
        "proteins_100g",
        "carbohydrates_100g",
        "salt_100g",
      ];
      for (const key of important) {
        if (p.nutriments[key] !== undefined) {
          specs[key.replace("_100g", " per 100g")] = String(p.nutriments[key]);
        }
      }
    }

    return [
      {
        name: p.product_name || p.product_name_en || "",
        description: p.generic_name || p.generic_name_en || "",
        category: p.categories || "",
        price: "",
        images: filterValidImages(images),
        specifications: specs,
        sourceUrl: `https://world.openfoodfacts.org/product/${sku}`,
        sourceTitle: p.product_name || "",
      },
    ];
  } catch {
    return [];
  }
}

async function searchGoUPC(sku: string): Promise<SkuSearchMetadata[]> {
  try {
    const url = `https://go-upc.com/search?q=${encodeURIComponent(sku)}`;
    const content = await fetchPageWithLightpanda(url);
    if (!content || content.length < 100) return [];

    // Use LLM to extract product data from the page content
    const response = await callLLM(
      `You are a product data extractor. Given HTML/text content from a barcode lookup page (go-upc.com), extract product information.

Return ONLY a valid JSON array (no markdown). Each object:
{
  "name": "product name",
  "description": "brief description",
  "category": "category",
  "price": "price with currency or empty string",
  "images": ["image URLs"],
  "specifications": {"key": "value"},
  "sourceTitle": "product name"
}

Rules:
- Extract only actual product data, skip navigation/boilerplate text
- If no product found, return empty array []`,
      `Barcode/SKU: ${sku}\nPage content from go-upc.com:\n${content.substring(0, 4000)}`,
    );

    const parsed = parseJSON<any[]>(response);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item === "object" && item.name)
      .slice(0, 3)
      .map((item) => ({
        name: String(item.name || ""),
        description: String(item.description || ""),
        category: String(item.category || ""),
        price: String(item.price || ""),
        images: filterValidImages(
          Array.isArray(item.images) ? item.images.map(String) : [],
        ),
        specifications:
          item.specifications && typeof item.specifications === "object"
            ? Object.fromEntries(
                Object.entries(item.specifications).map(([k, v]) => [
                  String(k),
                  String(v),
                ]),
              )
            : {},
        sourceUrl: url,
        sourceTitle: String(item.sourceTitle || item.name || ""),
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// Main Search Function
// ============================================================================

export async function searchProductBySku(
  sku: string,
  onStatus?: StatusCallback,
): Promise<SkuSearchResult> {
  const startTime = Date.now();

  const trimmedSku = sku.trim();
  if (!trimmedSku) {
    return { success: false, error: "SKU cannot be empty" };
  }

  if (trimmedSku.length > 100) {
    return { success: false, error: "SKU is too long (max 100 characters)" };
  }

  const session = await getSession();
  if (!session) {
    return { success: false, error: "Authentication required" };
  }

  const rateCheck = checkRateLimit(session.userId);
  if (!rateCheck.allowed) {
    logSearch({
      userId: session.userId,
      userName: session.userName,
      sku: trimmedSku,
      success: false,
      resultCount: 0,
      source: "rate-limited",
      timestamp: new Date().toISOString(),
      error: "Rate limit exceeded",
      durationMs: Date.now() - startTime,
    });
    return {
      success: false,
      error: "Too many requests. Please wait a moment before trying again.",
      rateLimit: { remaining: 0 },
    };
  }

  try {
    // ---- Phase 1 (PRIMARY): Agentic AI Search via Lightpanda ----
    onStatus?.("Starting agentic product search...");
    const agenticResults = await agenticProductSearch(trimmedSku, onStatus);
    if (agenticResults.length > 0) {
      const durationMs = Date.now() - startTime;
      logSearch({
        userId: session.userId,
        userName: session.userName,
        sku: trimmedSku,
        success: true,
        resultCount: agenticResults.length,
        source: "agentic-lightpanda",
        timestamp: new Date().toISOString(),
        durationMs,
      });
      return {
        success: true,
        data: agenticResults,
        rateLimit: { remaining: rateCheck.remaining },
      };
    }

    // ---- Phase 2 (FALLBACK): UPCitemdb + Open Food Facts + GoUPC in parallel ----
    onStatus?.("Checking barcode databases...");
    const [upcResults, goUpcResults, offResults] = await Promise.all([
      searchUPCitemdb(trimmedSku),
      searchGoUPC(trimmedSku),
      searchOpenFoodFacts(trimmedSku),
    ]);

    const apiResults = [...upcResults, ...offResults, ...goUpcResults].filter(
      (r) => r.name,
    );
    if (apiResults.length > 0) {
      const durationMs = Date.now() - startTime;
      const source =
        upcResults.length > 0
          ? "upcitemdb"
          : offResults.length > 0
            ? "openfoodfacts"
            : "go-upc";
      onStatus?.(`Found ${apiResults.length} products from ${source}`);
      logSearch({
        userId: session.userId,
        userName: session.userName,
        sku: trimmedSku,
        success: true,
        resultCount: apiResults.length,
        source,
        timestamp: new Date().toISOString(),
        durationMs,
      });
      return {
        success: true,
        data: apiResults.slice(0, 5),
        rateLimit: { remaining: rateCheck.remaining },
      };
    }

    // ---- No results from any source ----
    const durationMs = Date.now() - startTime;
    logSearch({
      userId: session.userId,
      userName: session.userName,
      sku: trimmedSku,
      success: false,
      resultCount: 0,
      source: "none",
      timestamp: new Date().toISOString(),
      error: "No results found",
      durationMs,
    });

    return {
      success: false,
      error: `No product results found for SKU "${trimmedSku}". Try searching with the product name or barcode instead.`,
      rateLimit: { remaining: rateCheck.remaining },
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    let errorMessage = "Search failed. Please try again.";

    if (error instanceof Error) {
      if (error.name === "TimeoutError" || error.message.includes("timeout")) {
        errorMessage =
          "Search timed out. Please check your internet connection and try again.";
      } else if (
        error.message.includes("fetch failed") ||
        error.message.includes("network")
      ) {
        errorMessage = "Network error. Please check your internet connection.";
      }
    }

    logSearch({
      userId: session.userId,
      userName: session.userName,
      sku: trimmedSku,
      success: false,
      resultCount: 0,
      source: "error",
      timestamp: new Date().toISOString(),
      error: errorMessage,
      durationMs,
    });

    return { success: false, error: errorMessage };
  }
}
