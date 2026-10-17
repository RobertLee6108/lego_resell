import { normalizeNaverShoppingItem } from "@/lib/naver-shopping/normalize";
import type {
  NaverShoppingApiItem,
  NaverShoppingItem,
  NaverShoppingSearchInput,
  NaverShoppingSearchParams,
  NaverShoppingSearchResult,
} from "@/lib/naver-shopping/types";

const NAVER_SEARCH_URL = "https://search.naver.com/search.naver";

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function cleanHtmlText(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<\/?mark>/gi, "")
    .replace(/<\/?b>/gi, "")
    .trim();
}

function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildNaverExclude(input: {
  excludeUsed: boolean;
  excludeOverseas: boolean;
}): string | undefined {
  const values: string[] = [];
  if (input.excludeUsed) values.push("used");
  if (input.excludeOverseas) values.push("cbshop");
  return values.length > 0 ? values.join(":") : undefined;
}

export function validateSearchInput(input: NaverShoppingSearchInput) {
  const queries = input.queries.map((q) => q.trim()).filter(Boolean);
  if (queries.length < 1 || queries.length > 5) {
    throw new Error("검색어는 1~5개까지 입력할 수 있습니다.");
  }
  if (input.display < 1 || input.display > 100) {
    throw new Error("표시 개수는 1~100 사이여야 합니다.");
  }
  return { ...input, queries };
}

interface ParsedRawItem {
  productId: string;
  title: string;
  lprice: number;
  hprice: number;
  shippingFee: number;
  mallName: string;
  isOverseas: boolean;
  image: string | null;
  link: string;
}

function parseNaverSearchHtml(html: string): ParsedRawItem[] {
  const items: ParsedRawItem[] = [];
  const liRegex = /<li[^>]*data-slog-content="shp_dui:[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;

  while ((match = liRegex.exec(html)) !== null) {
    const block = match[1];

    const midMatch = block.match(/nv_mid=([0-9]+)/);
    const productId = midMatch ? midMatch[1] : "";

    const titleMatch =
      block.match(/<img[^>]*alt="([^"]*)"/i) ||
      block.match(
        /data-nlog-area="shp_dui\.a\.(?:itemtit|outtit)"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>/i,
      );
    let title = "";
    if (titleMatch) {
      title = cleanHtmlText(titleMatch[1]);
    }

    const imgMatch = block.match(/<img[^>]*src="([^"]*)"/i);
    const image = imgMatch ? imgMatch[1] : null;

    // 1. 할인 전 판매가 (정가)
    const originalPriceMatch = block.match(
      /<span class="blind">할인\s*전\s*판매가<\/span>\s*<span class="lfETsaia">([0-9,]+)<\/span>/i,
    );
    const originalPrice = originalPriceMatch
      ? parseInt(originalPriceMatch[1].replace(/,/g, ""), 10)
    : 0;

    // 2. 쿠폰 할인가 (있는 경우)
    const couponPriceMatch =
      block.match(
        /<span class="KM7Z6vSV">\s*<span class="lfETsaia">([0-9,]+)<\/span>[\s\S]*?쿠폰할인가/i,
      ) ||
      block.match(
        /<span class="lfETsaia">([0-9,]+)<\/span><span class="TVuGseeW">원<\/span><\/span>\s*<span class="[^"]*">쿠폰할인가/i,
      );
    const couponPrice = couponPriceMatch
      ? parseInt(couponPriceMatch[1].replace(/,/g, ""), 10)
      : 0;

    // 3. 일반 할인가 (할인% 배지 뒤의 가격)
    const discountPriceMatch = block.match(
      /<span class="blind">할인<\/span><\/span>\s*<span class="lfETsaia">([0-9,]+)<\/span>/i,
    );
    const discountPrice = discountPriceMatch
      ? parseInt(discountPriceMatch[1].replace(/,/g, ""), 10)
      : 0;

    // 4. block 내의 모든 lfETsaia 가격
    const allPrices = [
      ...block.matchAll(/<span class="lfETsaia">([0-9,]+)<\/span>/gi),
    ].map((m) => parseInt(m[1].replace(/,/g, ""), 10));

    // 최저가(실구매가): 쿠폰할인가 > 일반할인가 > (할인전 정가를 제외한 가격) > 첫 번째 가격
    let lprice = 0;
    if (couponPrice > 0) {
      lprice = couponPrice;
    } else if (discountPrice > 0) {
      lprice = discountPrice;
    } else {
      const validPrices =
        originalPrice > 0
          ? allPrices.filter((p) => p !== originalPrice)
          : allPrices;
      lprice = validPrices.length > 0 ? validPrices[0] : allPrices[0] || 0;
    }

    const hprice = originalPrice > 0 ? originalPrice : 0;

    let shippingFee = 0;
    if (!block.includes("배송비</span>무료")) {
      const shipMatch = block.match(/배송비<\/span>([0-9,]+)원/);
      if (shipMatch) {
        shippingFee = parseInt(shipMatch[1].replace(/,/g, ""), 10);
      }
    }

    let mallName = "네이버";
    const catalogMallMatch = block.match(/판매처<!-- -->\s*([0-9]+)/);
    const mallMatch = block.match(
      /data-nlog-area="shp_dui\.a\.outmall"[^>]*>([^<]+)<\/a>/,
    );
    if (catalogMallMatch) {
      mallName = `네이버(가격비교 ${catalogMallMatch[1]}곳)`;
    } else if (mallMatch) {
      mallName = cleanHtmlText(mallMatch[1]);
    }

    const isOverseas = block.includes(">해외<");

    const linkMatch = block.match(
      /href="([^"]*(?:cr3\.shopping\.naver\.com|smartstore\.naver\.com)[^"]*)"/,
    );
    const link = linkMatch ? linkMatch[1].replace(/&amp;/g, "&") : "";

    if (productId && title && lprice > 0) {
      items.push({
        productId,
        title,
        lprice,
        hprice,
        shippingFee,
        mallName,
        isOverseas,
        image,
        link,
      });
    }
  }

  return items;
}

export async function fetchNaverShopping(
  params: NaverShoppingSearchParams,
): Promise<NaverShoppingSearchResult> {
  const url = new URL(NAVER_SEARCH_URL);
  url.searchParams.set("where", "nexearch");
  url.searchParams.set("query", params.query);

  const userAgent = getRandomUserAgent();
  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      "Sec-Ch-Ua":
        '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `네이버 쇼핑 검색에 실패했습니다. (HTTP ${response.status})`,
    );
  }

  const html = await response.text();
  let parsedItems = parseNaverSearchHtml(html);

  // 제외 필터 적용
  if (params.exclude) {
    if (params.exclude.includes("cbshop")) {
      parsedItems = parsedItems.filter((item) => !item.isOverseas);
    }
    if (params.exclude.includes("used")) {
      parsedItems = parsedItems.filter((item) => !item.title.includes("중고"));
    }
  }

  // 정렬 옵션 적용
  if (params.sort === "asc") {
    parsedItems.sort((a, b) => a.lprice - b.lprice);
  } else if (params.sort === "dsc") {
    parsedItems.sort((a, b) => b.lprice - a.lprice);
  }

  // display 개수 제한
  if (params.display && params.display > 0) {
    parsedItems = parsedItems.slice(0, params.display);
  }

  // 기존 NaverShoppingItem 규격으로 변환
  const items: NaverShoppingItem[] = parsedItems.map((item) => {
    const raw: NaverShoppingApiItem = {
      title: item.title,
      link: item.link,
      image: item.image ?? "",
      lprice: String(item.lprice),
      hprice: String(item.hprice),
      mallName: item.mallName,
      productId: item.productId,
      productType: "1",
      maker: "레고",
      brand: "레고",
      category1: "출산/육아",
      category2: "완구/매트",
      category3: "블록놀이",
      category4: "레고",
    };

    const normalized = normalizeNaverShoppingItem(raw, params.query, null);
    normalized.shippingFeeOverride = item.shippingFee;
    return normalized;
  });

  return {
    query: params.query,
    total: items.length,
    start: params.start ?? 1,
    display: items.length,
    items,
  };
}

export async function searchNaverShoppingMany(
  input: NaverShoppingSearchInput,
): Promise<NaverShoppingSearchResult[]> {
  const parsed = validateSearchInput(input);
  const exclude = buildNaverExclude(parsed);

  const results: NaverShoppingSearchResult[] = [];

  for (let i = 0; i < parsed.queries.length; i++) {
    const query = parsed.queries[i];
    // 여러 쿼리 호출 시 봇 탐지 회피를 위한 무작위 지연(Jitter)
    if (i > 0) {
      await randomDelay(800, 1500);
    }

    const result = await fetchNaverShopping({
      query,
      display: parsed.display,
      sort: parsed.sort,
      filter: parsed.filter,
      exclude,
    });

    results.push({
      ...result,
      items: result.items.map((item) => ({
        ...item,
        productNumber: parsed.productNumber || null,
      })),
    });
  }

  return results;
}
