import { notFound } from "next/navigation";
import { SetDetailView } from "@/components/sets/set-detail-view";
import { fetchAllSetCards } from "@/lib/set-cards";
import { parseSetIdFromSegments } from "@/lib/set-path";
import { buildSetDetail } from "@/lib/set-stats";
import {
  DEFAULT_LANGUAGE,
  loadCachedSets,
  loadSeriesNames,
} from "@/lib/tcgdex";

export default async function SetDetailPage({
  params,
}: {
  params: Promise<{ id: string[] }>;
}) {
  const { id: segments } = await params;
  const setId = parseSetIdFromSegments(segments);
  const lang = DEFAULT_LANGUAGE;

  const sets = loadCachedSets(lang);
  const set = sets?.find((entry) => entry.id === setId);
  if (!set) notFound();

  const [seriesNames, { cards, totalCount }] = await Promise.all([
    loadSeriesNames(lang),
    fetchAllSetCards(setId, lang),
  ]);

  const setDetail = buildSetDetail(set, seriesNames, lang);

  return (
    <SetDetailView
      setId={setId}
      setDetail={setDetail}
      initialCards={cards}
      totalCount={totalCount}
    />
  );
}