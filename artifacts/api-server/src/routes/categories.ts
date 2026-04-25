import { Router, type IRouter } from "express";
import { db, categoriesTable, articlesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { insertCategorySchema } from "@workspace/db";

const router: IRouter = Router();

// ── GET /categories — lista pública con conteo de artículos ──────────────────
router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      description: categoriesTable.description,
      parentId: categoriesTable.parentId,
      order: categoriesTable.order,
      articleCount: sql<number>`cast(count(${articlesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(articlesTable, eq(categoriesTable.id, articlesTable.categoryId))
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.order, categoriesTable.name);

  res.json(
    categories.map((c) => ({
      ...c,
      description: c.description ?? null,
      parentId: c.parentId ?? null,
      articleCount: Number(c.articleCount ?? 0),
    }))
  );
});

// ── POST /admin/categories — crear categoría ─────────────────────────────────
router.post("/admin/categories", requireAuth, async (req, res): Promise<void> => {
  const parsed = insertCategorySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  // Generar slug automáticamente si no viene
  let slug = parsed.data.slug ?? "";
  if (!slug) {
    slug = parsed.data.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  const existing = await db
    .select({ id: categoriesTable.id })
    .from(categoriesTable)
    .where(eq(categoriesTable.slug, slug));

  if (existing.length > 0) {
    res.status(409).json({ error: "Ya existe una categoría con ese slug" });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({ ...parsed.data, slug })
    .returning();

  res.status(201).json(category);
});

// ── PUT /admin/categories/:id — editar categoría ─────────────────────────────
router.put("/admin/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  const parsed = insertCategorySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Datos inválidos", details: parsed.error.flatten() });
    return;
  }

  const [updated] = await db
    .update(categoriesTable)
    .set(parsed.data)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }

  res.json(updated);
});

// ── DELETE /admin/categories/:id — eliminar categoría ───────────────────────
router.delete("/admin/categories/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID inválido" });
    return;
  }

  // No borrar si tiene artículos asociados
  const [{ count }] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(articlesTable)
    .where(eq(articlesTable.categoryId, id));

  if (Number(count) > 0) {
    res.status(409).json({
      error: "No se puede eliminar una categoría con artículos. Reasigna los artículos primero.",
    });
    return;
  }

  // Desasociar subcategorías (poner parentId en null)
  await db
    .update(categoriesTable)
    .set({ parentId: null })
    .where(eq(categoriesTable.parentId, id));

  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }

  res.json({ success: true });
});

export default router;
