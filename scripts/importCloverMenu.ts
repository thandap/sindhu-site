/**
 * Sindhu West Clover CSV importer (Prisma 7).
 * Run from the Next.js project root. Requires `tsx` and `DATABASE_URL`.
 * Default is a read-only dry run; use --import to write.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { prisma } from "../lib/db/prisma";

const TENANT_SLUG = "sindhu-west";
const SOURCE = "clover-west-csv-2026-10";
const args = process.argv.slice(2);
const write = args.includes("--import");
const csvArg = args.find((a) => a.startsWith("--csv="));
if (!csvArg) throw new Error("Provide --csv=path/to/sindhu_west_clover_menu_preview.csv");
if (args.includes("--import") && args.includes("--dry-run")) throw new Error("Choose --import OR --dry-run");

// Parse quoted CSV cells (including commas, escaped quotes and newlines).
function parseCsv(input: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const src = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (quoted && src[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Malformed CSV: unclosed quoted field");
  row.push(cell); if (row.some((v) => v.trim())) rows.push(row);
  const [headers, ...data] = rows;
  if (!headers) throw new Error("CSV is empty");
  return data.map((values, i) => {
    if (values.length !== headers.length) throw new Error(`CSV row ${i + 2}: expected ${headers.length} columns, got ${values.length}`);
    return Object.fromEntries(headers.map((h, j) => [h.trim(), values[j].trim()]));
  });
}

const slugify = (v: string) => v.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const rows = parseCsv(readFileSync(resolve(csvArg.slice(6)), "utf8"));
const required = ["source_category", "category_sort_order", "item_position", "clover_item_id", "item_name", "price_cents"];
for (const key of required) if (rows.some((r) => !(key in r))) throw new Error(`Missing column: ${key}`);

type ImportRow = { cloverId: string; name: string; priceCents: number; description: string | null; category: string; categoryOrder: number; position: number; originalCategories: string[]; };
const byCloverId = new Map<string, ImportRow>();
for (const [i, row] of rows.entries()) {
  const id = row.clover_item_id;
  const name = row.item_name;
  const price = Number(row.price_cents);
  const position = Number(row.item_position);
  const categoryOrder = Number(row.category_sort_order);
  const category = row.proposed_category?.trim() || row.source_category;
  if (!id || !name || !category || !Number.isSafeInteger(price) || price < 0 || !Number.isSafeInteger(position) || !Number.isSafeInteger(categoryOrder))
    throw new Error(`Invalid values on CSV line ${i + 2}`);
  const prior = byCloverId.get(id);
  if (prior) {
    if (prior.priceCents !== price || prior.name !== name) throw new Error(`Conflicting duplicate Clover ID ${id}`);
    if (!prior.originalCategories.includes(row.source_category)) prior.originalCategories.push(row.source_category);
    continue; // One Resto item per Clover item ID; first category wins.
  }
  byCloverId.set(id, { cloverId: id, name, priceCents: price, description: row.description || null,
    category, categoryOrder, position, originalCategories: [row.source_category] });
}

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: TENANT_SLUG } });
  if (!tenant || !tenant.isActive) throw new Error(`Active tenant ${TENANT_SLUG} not found`);
  const categories = await prisma.menuCategory.findMany({ where: { tenantId: tenant.id } });
  const existingItems = await prisma.menuItem.findMany({ where: { tenantId: tenant.id } });
  const existingIds = new Map<string, string>();
  for (const item of existingItems) {
    const meta = item.metadata;
    if (meta && typeof meta === "object" && !Array.isArray(meta) && "cloverItemId" in meta && typeof meta.cloverItemId === "string") {
      existingIds.set(meta.cloverItemId, item.id);
    }
  }
  const unique = [...byCloverId.values()];
  const categoryNames = [...new Set(unique.map((r) => r.category))];
  const categorySlugs = new Map(categoryNames.map((name) => [name, slugify(name)]));
  if (new Set(categorySlugs.values()).size !== categoryNames.length) throw new Error("Category slugs collide");
  const newCategories = categoryNames.filter((name) => !categories.some((c) => c.slug === categorySlugs.get(name)));
  const newItems = unique.filter((r) => !existingIds.has(r.cloverId));
  const updates = unique.length - newItems.length;
  console.log(JSON.stringify({ mode: write ? "IMPORT" : "DRY RUN", tenant: tenant.slug, tenantId: tenant.id,
    csvRows: rows.length, uniqueCloverIds: unique.length, duplicateRows: rows.length - unique.length,
    categories: categoryNames, categoriesToCreate: newCategories, itemsToCreate: newItems.length, itemsToUpdate: updates,
    existingTenantItems: existingItems.length }, null, 2));
  if (!write) return;

  // Single transaction: a failure cannot leave a partial menu behind.
  await prisma.$transaction(async (tx) => {
    const catIds = new Map<string, string>();
    for (const name of categoryNames) {
      const slug = categorySlugs.get(name)!;
      const order = Math.min(...unique.filter((r) => r.category === name).map((r) => r.categoryOrder));
      const cat = await tx.menuCategory.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
        create: { tenantId: tenant.id, name, slug, sortOrder: order, isActive: false },
        update: {}, // Preserve any admin edits.
      });
      catIds.set(name, cat.id);
    }
    for (const r of unique) {
      const slug = `${slugify(r.name) || "item"}-${r.cloverId.toLowerCase()}`;
      const metadata = { importSource: SOURCE, cloverItemId: r.cloverId, originalCategories: r.originalCategories };
      const existingId = existingIds.get(r.cloverId);
      if (existingId) {
        // Preserve admin changes on re-import; only fill a missing description.
        const current = existingItems.find((x) => x.id === existingId)!;
        if (!current.description && r.description) await tx.menuItem.update({ where: { id: existingId }, data: { description: r.description } });
        continue;
      }
      // Do not overwrite an unrelated manually-created item with a matching slug.
      const collision = await tx.menuItem.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug } } });
      if (collision) throw new Error(`Slug collision with existing item: ${slug}`);
      await tx.menuItem.create({ data: { tenantId: tenant.id, categoryId: catIds.get(r.category)!, name: r.name,
        slug, description: r.description, priceCents: r.priceCents, isActive: false, isAvailable: true,
        sortOrder: r.position, metadata } });
    }
  }, { timeout: 120000 });
  console.log("Import committed successfully. New categories and items are inactive until approved.");
}

main().catch((err) => { console.error(err); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });
