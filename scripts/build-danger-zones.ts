import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { buildDangerZoneFile, parseSourceCsv } from "../src/lib/danger-zones/build.ts";
import { DATASET_ID } from "../src/lib/danger-zones/constants.ts";

const OUT = resolve("public/data/danger-zones.v1.json");
const API = `https://www.data.gouv.fr/api/1/datasets/${DATASET_ID}/`;

interface Resource {
  id?: string;
  url?: string;
  format?: string;
  type?: string;
  last_modified?: string;
}

async function main() {
  const response = await fetch(API);
  if (!response.ok) {
    throw new Error(`Dataset request failed (${response.status})`);
  }
  const dataset = (await response.json()) as { resources?: Resource[] };
  const tables = (dataset.resources ?? [])
    .filter((resource) => resource.format === "csv" && resource.type === "main" && resource.url)
    .sort((a, b) => (b.last_modified ?? "").localeCompare(a.last_modified ?? ""));
  const resource = tables[0];
  if (!resource?.url || !resource.id) {
    throw new Error("No source table found");
  }

  const fileResponse = await fetch(resource.url);
  if (!fileResponse.ok) {
    throw new Error(`Table download failed (${fileResponse.status})`);
  }
  const bytes = new Uint8Array(await fileResponse.arrayBuffer());
  const hash = createHash("sha256").update(bytes).digest("hex");

  let previous: string | null = null;
  try {
    const existing = JSON.parse(readFileSync(OUT, "utf8")) as {
      source?: { contentSha256?: string };
    };
    previous = existing.source?.contentSha256 ?? null;
  } catch {
    previous = null;
  }
  if (previous === hash) {
    console.log("Zones déjà à jour.");
    return;
  }

  const text = new TextDecoder("latin1").decode(bytes);
  const parsed = parseSourceCsv(text);
  const file = buildDangerZoneFile(
    parsed.rows,
    {
      generatedAt: new Date().toISOString(),
      contentSha256: hash,
      resourceLastModified: resource.last_modified ?? "",
      resourceId: resource.id,
      datasetId: DATASET_ID,
    },
    parsed.invalid,
  );

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(file)}\n`);
  console.log(`Écrit ${file.source.groups} zones (${file.source.included} sections) vers ${OUT}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
