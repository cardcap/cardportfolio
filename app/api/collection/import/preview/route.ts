import { requireSessionUserId } from "@/lib/api-auth";
import {
  buildImportPreview,
  fetchImportSource,
  loadImportIndexes,
  parseImportBuffer,
} from "@/lib/collection-import";
import { DEFAULT_LANGUAGE, isCardLanguage } from "@/lib/tcgdex-constants";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";

    let buffer: Buffer;
    let filename = "import.csv";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const url = form.get("url");

      if (file instanceof File) {
        buffer = Buffer.from(await file.arrayBuffer());
        filename = file.name || filename;
      } else if (typeof url === "string" && url.trim()) {
        const fetched = await fetchImportSource(url);
        buffer = fetched.buffer;
        filename = fetched.filename;
      } else {
        return NextResponse.json(
          { error: "Bitte eine Datei hochladen oder einen Link angeben." },
          { status: 400 },
        );
      }
    } else {
      const body = (await request.json()) as { url?: string };
      if (!body.url?.trim()) {
        return NextResponse.json(
          { error: "Bitte einen gültigen Link angeben." },
          { status: 400 },
        );
      }
      const fetched = await fetchImportSource(body.url);
      buffer = fetched.buffer;
      filename = fetched.filename;
    }

    const parsedRows = parseImportBuffer(buffer, filename);
    const langs = new Set(
      parsedRows.map((row) =>
        isCardLanguage(row.language) ? row.language : DEFAULT_LANGUAGE,
      ),
    );
    langs.add(DEFAULT_LANGUAGE);

    const preview = buildImportPreview(parsedRows, loadImportIndexes(langs));
    return NextResponse.json(preview);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import-Vorschau fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}