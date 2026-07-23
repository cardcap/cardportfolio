import {
  DEFAULT_LANGUAGE,
  fetchSetsFromTcgdex,
  isCardLanguage,
} from "@/lib/tcgdex";
import { NextRequest, NextResponse } from "next/server";

export const revalidate = 300;

export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const lang = isCardLanguage(langParam) ? langParam : DEFAULT_LANGUAGE;

  try {
    const result = await fetchSetsFromTcgdex(lang);
    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Sets API error:", error);
    return NextResponse.json(
      { error: "Sets konnten nicht geladen werden." },
      { status: 502 },
    );
  }
}