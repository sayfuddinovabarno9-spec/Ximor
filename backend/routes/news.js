const express = require('express');
const router = express.Router();

let cache = { data: null, at: 0 };
const CACHE_TTL = 30 * 60 * 1000;

const STOP = new Set([
  'the','and','for','that','this','with','from','into','over','under','about','after',
  'before','through','without','scientists','researchers','team','study','research',
  'finds','found','shows','show','reveal','reveals','create','creates','unlock','unlocks',
  'could','would','might','also','just','even','only','more','most','less','some','many',
  'when','where','which','how','what','why','than','can','will','now','then','there',
  'have','been','being','every','new','novel','breakthrough','discover','develops',
  'improve','ancient','hidden','smart','clean','synthetic','artificial',
  'these','those','their','them','both','each','all','any','few','much','very',
  'long','short','high','low','large','small','big','fast','hard','soft','strong','weak',
  'first','last','next','past','future','recent','early','same','type','way','key',
  'turn','turns','make','made','build','built','use','used','uses','using','get','gets',
  'help','helps','lead','leads','prove','proves','back','down','left','right',
  'discover','creates','produces','generates','toward','between','without','behind',
  'while','where','once','again','never','always','often','still','already','another',
  'said','says','show','take','come','goes','puts','push','pull','give','gave',
]);

function extractKeywords(title) {
  const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
  const candidates = words.filter(w => w.length >= 4 && !STOP.has(w));
  // dedupe and sort longest first (chemistry compound names tend to be longer)
  return [...new Set(candidates)].sort((a, b) => b.length - a.length).slice(0, 3);
}

async function getWikiImage(keyword) {
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!r.ok) return null;
    const data = await r.json();
    return data?.thumbnail?.source || null;
  } catch { return null; }
}

async function fetchArticleImage(title) {
  const keywords = extractKeywords(title);
  if (!keywords.length) return null;
  const results = await Promise.all(keywords.map(kw => getWikiImage(kw)));
  return results.find(img => img !== null) || null;
}

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

async function fetchNews() {
  const r = await fetch('https://www.sciencedaily.com/rss/matter_energy/chemistry.xml', {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; XimorBot/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`RSS ${r.status}`);
  const xml = await r.text();

  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12);
  const articles = items.map(([, inner]) => {
    const get = tag => {
      const m = inner.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return m ? decode(m[1].trim()) : '';
    };
    return {
      title:       get('title'),
      description: get('description'),
      url:         get('guid') || get('link'),
      date:        get('pubDate'),
      source:      'ScienceDaily',
    };
  }).filter(a => a.title && a.url);

  const withImages = await Promise.all(
    articles.map(async a => ({ ...a, image: await fetchArticleImage(a.title) }))
  );

  return withImages;
}

router.get('/', async (_req, res) => {
  try {
    if (cache.data && Date.now() - cache.at < CACHE_TTL) {
      return res.json(cache.data);
    }
    const articles = await fetchNews();
    cache = { data: articles, at: Date.now() };
    res.json(articles);
  } catch (err) {
    if (cache.data) return res.json(cache.data);
    res.status(502).json({ error: 'Yangiliklar yuklanmadi', details: err.message });
  }
});

module.exports = router;
