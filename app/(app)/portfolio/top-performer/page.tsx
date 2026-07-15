import { MoversList } from "@/components/dashboard/movers-list";
import { topPerformersAll } from "@/lib/mock-data";

export default function TopPerformerPage() {
  return (
    <MoversList
      title="Top Performer"
      subtitle="Die 10 stärksten Gewinner der letzten 7 Tage"
      items={topPerformersAll}
      mode="winner"
    />
  );
}
