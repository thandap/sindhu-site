import "dotenv/config";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/db/prisma";

const TENANT_SLUG = "sindhu-west";
const DEFAULT_CSV = "data/sindhu_west_category_review.csv";
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const dryRun = args.includes("--dry-run");
if (apply === dryRun) {
  console.error("Specify exactly one of --dry-run or --apply");
  process.exit(1);
}
const csvArg = args.find((arg) => arg.startsWith("--csv="));
const csvPath = resolve(csvArg ? csvArg.slice(6) : DEFAULT_CSV);

// Small RFC-4180 CSV parser: supports quoted commas, escaped quotes, and line breaks.
function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"' && field === "") quoted = true;
    else if (char === ",") { row.push(field); field = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = []; field = "";
    } else field += char;
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field");
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function slugify(value: string): string {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function metadataCloverId(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const id = (value as Record<string, unknown>).cloverItemId;
  return typeof id === "string" ? id.trim() : undefined;
}

async function main() {
  const rows = parseCsv(readFileSync(csvPath, "utf8"));
  const headers = rows.shift()?.map((x) => x.trim()) ?? [];
  const idIndex = headers.indexOf("clover_item_id");
  const categoryIndex = headers.indexOf("proposed_category");
  if (idIndex < 0 || categoryIndex < 0) throw new Error("CSV requires clover_item_id and proposed_category columns");
  const assignments = new Map<string, string>();
  const excluded: string[] = [];
  for (const [i, row] of rows.entries()) {
    const id = (row[idIndex] ?? "").trim();
    const category = (row[categoryIndex] ?? "").trim();
    if (!id) throw new Error(`Missing Clover ID on CSV data row ${i + 2}`);
    if (!category || category.toLowerCase() === "needs classification") {
      excluded.push(id); continue;
    }
    if (!slugify(category)) throw new Error(`Invalid category on row ${i + 2}`);
    const prior = assignments.get(id);
    if (prior && prior !== category) throw new Error(`Conflicting categories for Clover ID ${id}: ${prior} vs ${category}`);
    assignments.set(id, category);
  }
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG }, select: { id: true } });
  if (!tenant) throw new Error("Sindhu West tenant not found");
  const [items, existingCategories] = await Promise.all([
    prisma.menuItem.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true, categoryId: true, metadata: true } }),
    prisma.menuCategory.findMany({ where: { tenantId: tenant.id }, select: { id: true, name: true, slug: true } }),
  ]);
  const byCloverId = new Map<string, typeof items[number]>();
  for (const item of items) {
    const id = metadataCloverId(item.metadata);
    if (!id) continue;
    if (byCloverId.has(id)) throw new Error(`Multiple database items share Clover ID ${id}`);
    byCloverId.set(id, item);
  }
  const existingBySlug = new Map(existingCategories.map((cat) => [cat.slug, cat]));
  const changes: { id: string; name: string; from: string; to: string; toSlug: string }[] = [];
  const unmatched: string[] = [];
  const neededCategories = new Map<string, string>();
  for (const [cloverId, category] of assignments) {
    const item = byCloverId.get(cloverId);
    if (!item) { unmatched.push(cloverId); continue; }
    const slug = slugify(category);
    const target = existingBySlug.get(slug);
    if (target && target.id === item.categoryId) continue;
    neededCategories.set(slug, category);
    changes.push({ id: item.id, name: item.name, from: existingCategories.find((c) => c.id === item.categoryId)?.name ?? "Unknown", to: category, toSlug: slug });
  }
  const categoriesToCreate = [...neededCategories].filter(([slug]) => !existingBySlug.has(slug)).map(([, name]) => name);
  console.log(JSON.stringify({ mode: apply ? "APPLY" : "DRY RUN", tenant: TENANT_SLUG,
    csvRows: rows.length, uniqueAssignedIds: assignments.size, excludedIds: [...new Set(excluded)].length,
    matchedItems: assignments.size - unmatched.length, unmatchedCloverIds: unmatched,
    categoriesToCreate, itemsToMove: changes.length,
    sampleMoves: changes.slice(0, 20).map(({ name, from, to }) => ({ name, from, to })) }, null, 2));
  if (unmatched.length) throw new Error("Unmatched Clover IDs detected. No changes applied; review the report.");
  if (!apply) { console.log("Dry run complete. Database unchanged."); return; }
  if (!changes.length) { console.log("No changes needed."); return; }
  await prisma.$transaction(async (tx) => {
    const targetIds = new Map<string, string>();
    for (const [slug, name] of neededCategories) {
      const category = await tx.menuCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        create: { tenantId: tenant.id, name, slug, isActive: false },
        update: {},
        select: { id: true },
      });
      targetIds.set(slug, category.id);
    }
    for (const change of changes) {
      const result = await tx.menuItem.updateMany({
        where: { id: change.id, tenantId: tenant.id },
        data: { categoryId: targetIds.get(change.toSlug)! },
      });
      if (result.count !== 1) throw new Error(`Failed to update ${change.name}`);
    }
  }, { timeout: 120000 });
  console.log(`Committed ${changes.length} item category changes. New categories remain inactive until approved.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
