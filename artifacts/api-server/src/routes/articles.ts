import { Router, type IRouter } from "express";
import { db, articlesTable, categoriesTable, usersTable } from "@workspace/db";
import { eq, desc, ilike, and, ne, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import {
  AdminCreateArticleBody,
  AdminUpdateArticleBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  content: string;
  categoryId: number;
  authorId: number;
  status: "draft" | "published";
  featured: boolean;
  views: number;
  readingTime: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string | null;
  categorySlug: string | null;
  categoryColor: string | null;
  categoryDescription: string | null;
  authorName: string | null;
};

function formatArticle(a: ArticleRow) {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    coverImageUrl: a.coverImageUrl ?? null,
    coverImageAlt: a.coverImageAlt ?? null,
    content: a.content,
    categoryId: a.categoryId,
    authorId: a.authorId,
    status: a.status,
    featured: a.featured,
    views: a.views,
    readingTime: a.readingTime,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    category: {
      id: a.categoryId,
      name: a.categoryName ?? "",
      slug: a.categorySlug ?? "",
      color: a.categoryColor ?? "#333333",
      description: a.categoryDescription ?? null,
      articleCount: 0,
    },
    authorName: a.authorName ?? "El Príncipe Mestizo",
  };
}

const articleSelect = {
  id: articlesTable.id,
  title: articlesTable.title,
  slug: articlesTable.slug,
  summary: articlesTable.summary,
  coverImageUrl: articlesTable.coverImageUrl,
  coverImageAlt: articlesTable.coverImageAlt,
  content: articlesTable.content,
  categoryId: articlesTable.categoryId,
  authorId: articlesTable.authorId,
  status: articlesTable.status,
  featured: articlesTable.featured,
  views: articlesTable.views,
  readingTime: articlesTable.readingTime,
  publishedAt: articlesTable.publishedAt,
  createdAt: articlesTable.createdAt,
  updatedAt: articlesTable.updatedAt,
  categoryName: categoriesTable.name,
  categorySlug: categoriesTable.slug,
  categoryColor: categoriesTable.color,
  categoryDescription: categoriesTable.description,
  authorName: usersTable.displayName,
} as const;

// Public: list paginated articles
router.get("/articles", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) ?? "10", 10)));
  const categorySlug = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(articlesTable.status, "published")];

  if (categorySlug) {
    const [cat] = await db.select({ id: categoriesTable.id }).from(categoriesTable).where(eq(categoriesTable.slug, categorySlug));
    if (cat) conditions.push(eq(articlesTable.categoryId, cat.id));
  }

  const whereClause = search
    ? and(and(...conditions), ilike(articlesTable.title, `%${search}%`))
    : and(...conditions);

  const totalResult = await db
    .select({ count: count() })
    .from(articlesTable)
    .where(whereClause);
  const total = Number(totalResult[0]?.count ?? 0);

  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit)
    .offset(offset);

  res.json({
    articles: articles.map(a => formatArticle(a as ArticleRow)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// Public: featured articles
router.get("/articles/featured", async (_req, res): Promise<void> => {
  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(and(eq(articlesTable.featured, true), eq(articlesTable.status, "published")))
    .orderBy(desc(articlesTable.publishedAt))
    .limit(3);

  res.json(articles.map(a => formatArticle(a as ArticleRow)));
});

// Public: most read (no auth needed — also public endpoint)
router.get("/admin/most-read", async (_req, res): Promise<void> => {
  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.status, "published"))
    .orderBy(desc(articlesTable.views))
    .limit(5);

  res.json(articles.map(a => formatArticle(a as ArticleRow)));
});

// Public: article by slug (increment views)
router.get("/articles/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [article] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(and(eq(articlesTable.slug, slug), eq(articlesTable.status, "published")));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // increment views
  await db.update(articlesTable).set({ views: (article.views ?? 0) + 1 }).where(eq(articlesTable.id, article.id));

  res.json(formatArticle({ ...(article as ArticleRow), views: (article.views ?? 0) + 1 }));
});

// Public: related articles
router.get("/articles/:slug/related", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [article] = await db
    .select({ id: articlesTable.id, categoryId: articlesTable.categoryId })
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug));

  if (!article) {
    res.json([]);
    return;
  }

  const related = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(and(
      eq(articlesTable.categoryId, article.categoryId),
      eq(articlesTable.status, "published"),
      ne(articlesTable.id, article.id)
    ))
    .orderBy(desc(articlesTable.publishedAt))
    .limit(3);

  res.json(related.map(a => formatArticle(a as ArticleRow)));
});

// Admin: list all articles
router.get("/admin/articles", requireAuth, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const conditions = [];
  if (status === "published") conditions.push(eq(articlesTable.status, "published"));
  else if (status === "draft") conditions.push(eq(articlesTable.status, "draft"));
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(articlesTable.createdAt));

  res.json(articles.map(a => formatArticle(a as ArticleRow)));
});

// Admin: create article
router.post("/admin/articles", requireAuth, async (req, res): Promise<void> => {
  const parsed = AdminCreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = (req as typeof req & { user: { userId: number } }).user;
  const { title, summary, content, categoryId, coverImageUrl, coverImageAlt, featured, status } = parsed.data;

  const slug = makeSlug(title);
  const readingTime = calcReadingTime(content);
  const publishedAt = status === "published" ? new Date() : undefined;

  const [article] = await db.insert(articlesTable).values({
    title,
    slug,
    summary,
    content,
    categoryId,
    authorId: user.userId,
    coverImageUrl: coverImageUrl ?? undefined,
    coverImageAlt: coverImageAlt ?? undefined,
    featured: featured ?? false,
    status: status ?? "draft",
    readingTime,
    publishedAt,
  }).returning();

  const [full] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.id, article.id));

  res.status(201).json(formatArticle(full as ArticleRow));
});

// Admin: update article
router.put("/admin/articles/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const parsed = AdminUpdateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.title !== undefined) {
    updates.title = d.title;
    updates.slug = makeSlug(d.title);
  }
  if (d.summary !== undefined) updates.summary = d.summary;
  if (d.content !== undefined) {
    updates.content = d.content;
    updates.readingTime = calcReadingTime(d.content);
  }
  if (d.categoryId !== undefined) updates.categoryId = d.categoryId;
  if (d.coverImageUrl !== undefined) updates.coverImageUrl = d.coverImageUrl ?? undefined;
  if (d.coverImageAlt !== undefined) updates.coverImageAlt = d.coverImageAlt ?? undefined;
  if (d.featured !== undefined) updates.featured = d.featured;
  if (d.status !== undefined) {
    updates.status = d.status;
    if (d.status === "published" && !existing.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  await db.update(articlesTable).set(updates as Partial<typeof existing>).where(eq(articlesTable.id, id));

  const [full] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.id, id));

  res.json(formatArticle(full as ArticleRow));
});

// Admin: delete article
router.delete("/admin/articles/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select({ id: articlesTable.id }).from(articlesTable).where(eq(articlesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  await db.delete(articlesTable).where(eq(articlesTable.id, id));
  res.json({ ok: true });
});

// Admin: toggle publish
router.patch("/admin/articles/:id/publish", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const newStatus = existing.status === "published" ? "draft" : "published";
  const publishedAt = newStatus === "published" && !existing.publishedAt ? new Date() : existing.publishedAt ?? undefined;

  await db.update(articlesTable).set({ status: newStatus, publishedAt }).where(eq(articlesTable.id, id));

  const [full] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.id, id));

  res.json(formatArticle(full as ArticleRow));
});

// Admin: toggle featured
router.patch("/admin/articles/:id/feature", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  await db.update(articlesTable).set({ featured: !existing.featured }).where(eq(articlesTable.id, id));

  const [full] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.id, id));

  res.json(formatArticle(full as ArticleRow));
});

export default router;
