import * as cheerio from 'cheerio';
import axios from 'axios';
import { fallbackData } from './fallback-data.js';

const CACHE_DURATION = 60 * 60 * 1000;
const scrapedDataCache = new Map();
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const REQUEST_TIMEOUT = 30000;

const getCachedData = (key) => {
  const cached = scrapedDataCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  scrapedDataCache.set(key, {
    data,
    timestamp: Date.now(),
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const scrapeAirlineInfo = async () => {
  const cacheKey = 'airline_info';
  const cached = getCachedData(cacheKey);
  if (cached) {
    console.log('Using cached scraped data');
    return cached;
  }

  try {
    const baseUrl = 'https://www.airindia.com/content/air-india/in/en/frequently-asked-questions/';
    const urls = {
      baggage: `${baseUrl}baggage.html`,
      checkIn: `${baseUrl}check-in.html`,
      booking: `${baseUrl}booking.html`,
      policies: `${baseUrl}cancellation-refund.html`,
      maharajaClub: 'https://www.airindia.com/in/en/maharaja-club/faqs.html',
    };

    console.log('Starting to scrape Air India website...');
    console.log('This may take up to 2 minutes due to website response times...');
    
    const scrapePromises = Object.entries(urls).map(async ([key, url]) => {
      console.log(`Scraping ${key}...`);
      try {
        const result = await scrapePageText(url, key);
        if (result) {
          console.log(`✅ ${key} scraped successfully (${result.length} chars)`);
          return { key, result, success: true };
        } else {
          console.log(`❌ ${key} failed to scrape`);
          return { key, result: null, success: false };
        }
      } catch (error) {
        console.log(`❌ ${key} error: ${error.message}`);
        return { key, result: null, success: false };
      }
    });

    const results = await Promise.allSettled(scrapePromises);

    const info = {
      timestamp: new Date().toISOString(),
    };

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { key, result: pageResult } = result.value;
        info[key] = pageResult;
      }
    });

    Object.keys(urls).forEach(key => {
      if (!info.hasOwnProperty(key)) {
        info[key] = null;
      }
    });

    const successCount = Object.keys(info).filter(k => k !== 'timestamp' && info[k] !== null).length;
    if (successCount > 0) {
      setCachedData(cacheKey, info);
      const totalPages = Object.keys(urls).length;
      console.log(`✅ Scraped ${successCount}/${totalPages} pages successfully`);
      return info;
    }
    
    console.warn('⚠️ Failed to scrape any pages. Using fallback data for development.');
    console.warn('⚠️ Note: This is fallback data. For production, ensure scraping works or use a different data source.');
    
    const fallbackInfo = {
      ...fallbackData,
      timestamp: new Date().toISOString(),
      isFallback: true,
    };
    
    setCachedData(cacheKey, fallbackInfo);
    return fallbackInfo;
  } catch (error) {
    console.error('Error scraping airline info:', error);
    return null;
  }
};

const scrapePageText = async (url, pageType) => {
  const cacheKey = `page_${pageType}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return cached;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Cache-Control': 'max-age=0',
          'Referer': 'https://www.airindia.com/',
        },
        timeout: REQUEST_TIMEOUT,
        validateStatus: (status) => status < 500,
        maxRedirects: 5,
        decompress: true,
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}`);
      }

      const $ = cheerio.load(response.data);
      
      $('script, style, nav, footer, header, aside, .cookie, .popup, .modal, .advertisement, .ad, iframe, noscript').remove();
      
      let text = '';
      
      const contentSelectors = [
        'main article',
        'main .content',
        'main',
        '.main-content',
        '.page-content',
        'article',
        '#content',
        '.content-wrapper',
      ];

      for (const selector of contentSelectors) {
        const content = $(selector).first();
        if (content.length > 0) {
          const extracted = extractRelevantText($, content);
          if (extracted.length > 100) {
            text = extracted;
            break;
          }
        }
      }

      if (!text) {
        text = extractRelevantText($, $('body'));
      }
      
      const cleanedText = cleanText(text);
      
      if (cleanedText && cleanedText.length > 100) {
        setCachedData(cacheKey, cleanedText);
        return cleanedText;
      }
      
      throw new Error('Insufficient content extracted');
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, attempt);
        console.warn(`Attempt ${attempt + 1} failed for ${pageType}. Retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }
      console.error(`Error scraping ${url} (${pageType}):`, error.message);
      if (error.code === 'ECONNABORTED') {
        console.error(`Timeout exceeded for ${pageType}. The website may be slow or unreachable.`);
      }
      return null;
    }
  }
  
  return null;
};

const extractRelevantText = ($, element) => {
  const irrelevantSelectors = [
    '.menu', '.navigation', '.sidebar', '.social', '.share',
    '.breadcrumb', '.pagination', '.related', '.tags',
    '.comments', '.author', '.date', '.meta',
  ];
  
  irrelevantSelectors.forEach(selector => {
    element.find(selector).remove();
  });

  const paragraphs = element.find('p, li, dt, dd, h1, h2, h3, h4, h5, h6, .text, .description');
  let text = '';
  
  paragraphs.each((i, elem) => {
    const content = $(elem).text().trim();
    if (content.length > 20 && !isNavigationText(content)) {
      text += content + ' ';
    }
  });

  if (text.length < 100) {
    text = element.text();
  }

  return text;
};

const isNavigationText = (text) => {
  const navKeywords = ['home', 'menu', 'search', 'login', 'sign up', 'cookie', 'privacy', 'terms'];
  const lowerText = text.toLowerCase();
  return navKeywords.some(keyword => lowerText.includes(keyword)) && text.length < 50;
};

const cleanText = (text) => {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/[^\w\s.,;:!?()\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);
};

