import { buildSetDetail } from "@/lib/set-stats";
import {
  DEFAULT_LANGUAGE,
  isCardLanguage,
  loadCachedSets,
  loadSeriesNames,
} from "@/lib/tcgdex";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const langParam = request.nextUrl.searchParams.get("lang") ?? DEFAULT_LANGUAGE;
  const lang = isCardLanguage(langParam) ? langParam : DEFAULT_LANGUAGE;

  try {
    const sets = loadCachedSets(lang);
    const set = sets?.find((entry) => entry.id === id);

    if (!set) {
      return NextResponse.json(
        { error: "Set nicht gefunden." },
        { status: 404 },
      );
    }

    const seriesNames = await loadSeriesNames(lang);
    const detail = buildSetDetail(set, seriesNames, lang);

    return NextResponse.json({ data: detail });
  } catch (error) {
    console.error("Set detail API error:", error);
    return NextResponse.json(
      { error: "Set konnte nicht geladen werden." },
      { status: 502 },
    );
  }
}