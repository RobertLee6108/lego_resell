import {
  normalizeNaverShoppingResponse,
} from "@/lib/naver-shopping/normalize";
import type {
  NaverShoppingApiResponse,
  NaverShoppingSearchInput,
  NaverShoppingSearchParams,
  NaverShoppingSearchResult,
} from "@/lib/naver-shopping/types";

const NAVER_SHOPPING_API_URL = "https://openapi.naver.com/v1/search/shop.json";

const ERROR_MESSAGES: Record<string, string> = {
  SE01: "검색 요청 형식이 올바르지 않습니다.",
  SE02: "표시 개수는 1~100 사이여야 합니다.",
  SE03: "검색 시작 위치가 올바르지 않습니다.",
  SE04: "정렬 값이 올바르지 않습니다.",
  SE05: "검색 API URL이 올바르지 않습니다.",
  SE06: "검색어 인코딩 형식이 올바르지 않습니다.",
  SE99: "네이버 검색 API 내부 오류입니다.",
};

interface NaverErrorResponse {
  errorCode?: string;
  errorMessage?: string;
}

function credentials() {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "네이버 검색 API 키가 없습니다. NAVER_SEARCH_CLIENT_ID / NAVER_SEARCH_CLIENT_SECRET을 설정하세요.",
    );
  }

  return { clientId, clientSecret };
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

export async function fetchNaverShopping(
  params: NaverShoppingSearchParams,
): Promise<NaverShoppingSearchResult> {
  const { clientId, clientSecret } = credentials();
  const searchParams = new URLSearchParams({
    query: params.query,
    display: String(params.display),
    start: String(params.start ?? 1),
    sort: params.sort,
  });

  if (params.filter) searchParams.set("filter", params.filter);
  if (params.exclude) searchParams.set("exclude", params.exclude);

  const response = await fetch(`${NAVER_SHOPPING_API_URL}?${searchParams}`, {
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
    cache: "no-store",
  });

  const json = await response.json();

  if (!response.ok) {
    const error = json as NaverErrorResponse;
    const mapped = error.errorCode ? ERROR_MESSAGES[error.errorCode] : null;
    throw new Error(mapped ?? error.errorMessage ?? "네이버 쇼핑 검색에 실패했습니다.");
  }

  return normalizeNaverShoppingResponse(
    json as NaverShoppingApiResponse,
    params.query,
    null,
  );
}

export async function searchNaverShoppingMany(
  input: NaverShoppingSearchInput,
): Promise<NaverShoppingSearchResult[]> {
  const parsed = validateSearchInput(input);
  const exclude = buildNaverExclude(parsed);

  return Promise.all(
    parsed.queries.map(async (query) => {
      const result = await fetchNaverShopping({
        query,
        display: parsed.display,
        sort: parsed.sort,
        filter: parsed.filter,
        exclude,
      });
      return {
        ...result,
        items: result.items.map((item) => ({
          ...item,
          productNumber: parsed.productNumber || null,
        })),
      };
    }),
  );
}
