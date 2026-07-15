import { IMPORT_TEMPLATE_CSV } from "@/lib/collection-import";

export async function GET() {
  return new Response(`\uFEFF${IMPORT_TEMPLATE_CSV}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="cardcap-sammlung-vorlage.csv"',
    },
  });
}