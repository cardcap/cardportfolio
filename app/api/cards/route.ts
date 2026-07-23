import {
  DEFAULT_LANGUAGE,
  fetchCardsFromTcgdex,
  isCardLanguage,
} from "@/lib/tcgdex";
import { NextRequest, NextResponse } from "next/server";

// Catalog is static JSON on disk — allow edge/CDN caching of responses
export const revalidate = 300;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const langParam = searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const lang = isCardLanguage(langParam) ? langParam : DEFAULT_LANGUAGE;

  try {
    const result = await fetchCardsFromTcgdex({
      lang,
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "20"),
      search: searchParams.get("search") ?? undefined,
      setId: searchParams.get("set") ?? undefined,
      rarity: searchParams.get("rarity") ?? undefined,
      color: searchParams.get("color") ?? undefined,
    });

    return NextResponse.json(result, {
      headers: {
        // Public catalog — browser/CDN can reuse for 5 minutes
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Cards API error:", error);
    return NextResponse.json(
      { error: "Karten konnten nicht geladen werden." },
      { status: 502 },
    );
  }
}