import { Router, type IRouter } from "express";
import { db, categoriesTable, articlesTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select({
      id: categoriesTable.id,
      name: categoriesTable.name,
      slug: categoriesTable.slug,
      color: categoriesTable.color,
      description: categoriesTable.description,
      articleCount: sql<number>`cast(count(${articlesTable.id}) as int)`,
    })
    .from(categoriesTable)
    .leftJoin(
      articlesTable,
      eq(categoriesTable.id, articlesTable.categoryId)
    )
    .groupBy(categoriesTable.id)
    .orderBy(categoriesTable.name);

  res.json(categories.map(c => ({
    ...c,
    description: c.description ?? null,
    articleCount: Number(c.articleCount ?? 0),
  })));
});

export default router;
