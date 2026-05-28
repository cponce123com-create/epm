import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  articlesTable,
  categoriesTable,
  usersTable,
  commentsTable,
  articleRevisionsTable,
  articleViewsTable,
} from "@workspace/db";
import { eq, desc, ilike, and, or, ne, count, sql, inArray, gte, gt } from "drizzle-orm";
import crypto from "crypto";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "../middlewares/requireAuth";
import { requireSuperAdmin } from "../middlewares/requireSuperAdmin";
import { makeSlug, calcReadingTime } from "../lib/slugify";
import { sanitizeHtml } from "../lib/sanitize";
import { safeError } from "../lib/safeError";
import { logger } from "../lib/logger";
import {
  AdminCreateArticleBody,
  AdminUpdateArticleBody,
} from "@workspace/api-zod";

const router: IRouter = Router();
const secondaryCategoriesTable = alias(categoriesTable, "secondary_categories");

type ArticleRow = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  content: string;
  categoryId: number;
  secondaryCategoryId: number | null;
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
  secondaryCategoryName: string | null;
  secondaryCategorySlug: string | null;
  secondaryCategoryColor: string | null;
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
    secondaryCategoryId: a.secondaryCategoryId ?? null,
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
    secondaryCategory: a.secondaryCategoryId
      ? {
          id: a.secondaryCategoryId,
          name: a.secondaryCategoryName ?? "",
          slug: a.secondaryCategorySlug ?? "",
          color: a.secondaryCategoryColor ?? "#555555",
        }
      : null,
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
  secondaryCategoryId: articlesTable.secondaryCategoryId,
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
  secondaryCategoryName: secondaryCategoriesTable.name,
  secondaryCategorySlug: secondaryCategoriesTable.slug,
  secondaryCategoryColor: secondaryCategoriesTable.color,
  authorName: usersTable.displayName,
} as const;

// Public: list paginated articles
router.get("/articles", async (req, res): Promise<void> => {
  const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
  const limit = Math.min(
    50,
    Math.max(1, parseInt((req.query.limit as string) ?? "10", 10)),
  );
  const categorySlug = req.query.category as string | undefined;
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(articlesTable.status, "published")];

  if (categorySlug) {
    const [cat] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, categorySlug));
    if (cat) {
      // Include articles from child categories too
      const children = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.parentId, cat.id));
      const allIds = [cat.id, ...children.map((c) => c.id)];
      const catFilter = or(
        inArray(articlesTable.categoryId, allIds),
        inArray(articlesTable.secondaryCategoryId, allIds),
      );
      if (catFilter) conditions.push(catFilter);
    }
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
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(articlesTable.publishedAt))
    .limit(limit)
    .offset(offset);

  res.json({
    articles: articles.map((a) => formatArticle(a as ArticleRow)),
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
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(
      and(
        eq(articlesTable.featured, true),
        eq(articlesTable.status, "published"),
      ),
    )
    .orderBy(desc(articlesTable.publishedAt))
    .limit(3);

  res.json(articles.map((a) => formatArticle(a as ArticleRow)));
});

// Public: most read (no auth needed — also public endpoint)
router.get("/admin/most-read", async (_req, res): Promise<void> => {
  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.status, "published"))
    .orderBy(desc(articlesTable.views))
    .limit(5);

  res.json(articles.map((a) => formatArticle(a as ArticleRow)));
});

// Public: article by slug (increment views)
router.get("/articles/:slug", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;

  const [article] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(
      and(eq(articlesTable.slug, slug), eq(articlesTable.status, "published")),
    );

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // increment views
  await db
    .update(articlesTable)
    .set({ views: (article.views ?? 0) + 1 })
    .where(eq(articlesTable.id, article.id));

  res.json(
    formatArticle({
      ...(article as ArticleRow),
      views: (article.views ?? 0) + 1,
    }),
  );
});

// Public: related articles
router.get("/articles/:slug/related", async (req, res): Promise<void> => {
  const slug = Array.isArray(req.params.slug)
    ? req.params.slug[0]
    : req.params.slug;

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
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(
      and(
        eq(articlesTable.categoryId, article.categoryId),
        eq(articlesTable.status, "published"),
        ne(articlesTable.id, article.id),
      ),
    )
    .orderBy(desc(articlesTable.publishedAt))
    .limit(3);

  res.json(related.map((a) => formatArticle(a as ArticleRow)));
});

// Admin: list all articles
router.get("/admin/articles", requireAuth, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const user = (req as any).user;
  const conditions = [];

  // Si no es superadmin, solo ve sus propios artículos
  if (user.role !== "superadmin") {
    conditions.push(eq(articlesTable.authorId, user.userId));
  }

  if (status === "published")
    conditions.push(eq(articlesTable.status, "published"));
  else if (status === "draft")
    conditions.push(eq(articlesTable.status, "draft"));
  if (search) conditions.push(ilike(articlesTable.title, `%${search}%`));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const articles = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(whereClause)
    .orderBy(desc(articlesTable.createdAt));

  res.json(articles.map((a) => formatArticle(a as ArticleRow)));
});

// Admin: create article
router.post("/admin/articles", requireAuth, async (req, res): Promise<void> => {
  const parsed = AdminCreateArticleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const user = (req as typeof req & { user: { userId: number } }).user;
  const {
    title,
    summary,
    content,
    categoryId,
    coverImageUrl,
    coverImageAlt,
    featured,
    status,
  } = parsed.data;

  // Sanitizar HTML antes de guardar (XSS prevention)
  const safeContent = sanitizeHtml(content);
  const safeSummary = sanitizeHtml(summary);

  const slug = makeSlug(title);
  const readingTime = calcReadingTime(safeContent);
  const publishedAt = status === "published" ? new Date() : undefined;

  const [article] = await db
    .insert(articlesTable)
    .values({
      title,
      slug,
      summary: safeSummary,
      content: safeContent,
      categoryId,
      authorId: user.userId,
      coverImageUrl: coverImageUrl ?? undefined,
      coverImageAlt: coverImageAlt ?? undefined,
      featured: featured ?? false,
      status: status ?? "draft",
      readingTime,
      publishedAt,
    })
    .returning();

  const [full] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(
      secondaryCategoriesTable,
      eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
    )
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.id, article.id));

  res.status(201).json(formatArticle(full as ArticleRow));
});

// Admin: update article
router.put(
  "/admin/articles/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const rawId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const id = parseInt(rawId, 10);

      const parsed = AdminUpdateArticleBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.message });
        return;
      }

      const d = parsed.data;

      const user = (req as any).user;
      const [existing] = await db
        .select({
          id: articlesTable.id,
          title: articlesTable.title,
          slug: articlesTable.slug,
          summary: articlesTable.summary,
          content: articlesTable.content,
          categoryId: articlesTable.categoryId,
          secondaryCategoryId: articlesTable.secondaryCategoryId,
          authorId: articlesTable.authorId,
          status: articlesTable.status,
          featured: articlesTable.featured,
          coverImageUrl: articlesTable.coverImageUrl,
          coverImageAlt: articlesTable.coverImageAlt,
          publishedAt: articlesTable.publishedAt,
        })
        .from(articlesTable)
        .where(eq(articlesTable.id, id));
      if (!existing) {
        res.status(404).json({ error: "Article not found" });
        return;
      }

      // Solo el autor o admin/superadmin pueden editar
      const canEdit =
        user.role === "superadmin" ||
        user.role === "admin" ||
        (user.role === "author" && existing.authorId === user.userId);

      if (!canEdit) {
        res.status(403).json({
          error: "No tienes permiso para editar este artículo",
        });
        return;
      }

      // Author solo puede editar artículos en draft, in_review o approved (no published/archived)
      if (
        user.role === "author" &&
        !["draft", "in_review", "approved"].includes(existing.status)
      ) {
        res.status(403).json({
          error: `No puedes editar artículos en estado "${existing.status}". Contacta a un editor.`,
        });
        return;
      }

      // Author NO puede cambiar status a published — debe pasar por revisión
      if (user.role === "author" && d.status === "published") {
        res.status(403).json({
          error:
            "No puedes publicar directamente. Envía el artículo a revisión.",
        });
        return;
      }

      const contentChanged =
        d.content !== undefined && d.content !== existing.content;

      // Guardar revisión automática si el contenido cambió (no bloqueante)
      if (contentChanged) {
        try {
          await db.insert(articleRevisionsTable).values({
            articleId: id,
            title: d.title ?? existing.title,
            content: d.content ?? existing.content,
            summary: d.summary ?? existing.summary,
            savedBy: user.userId,
          });
        } catch (revErr) {
          logger.warn({ revErr }, "Failed to save auto-revision (non-blocking)");
        }
      }

      const updates: Record<string, unknown> = {};
      if (d.title !== undefined) {
        updates.title = d.title;
        updates.slug = makeSlug(d.title);
      }
      if (d.summary !== undefined) updates.summary = sanitizeHtml(d.summary);
      if (d.content !== undefined) {
        const safeContent = sanitizeHtml(d.content);
        updates.content = safeContent;
        updates.readingTime = calcReadingTime(safeContent);
      }
      if (d.categoryId !== undefined) updates.categoryId = d.categoryId;
      if (d.secondaryCategoryId !== undefined) {
        updates.secondaryCategoryId = d.secondaryCategoryId;
      }
      if (d.coverImageUrl !== undefined)
        updates.coverImageUrl = d.coverImageUrl ?? undefined;
      if (d.coverImageAlt !== undefined)
        updates.coverImageAlt = d.coverImageAlt ?? undefined;
      if (d.featured !== undefined) updates.featured = d.featured;
      if (d.status !== undefined) {
        updates.status = d.status;
        if (d.status === "published" && !existing.publishedAt) {
          updates.publishedAt = new Date();
        }
      }
      // Registrar quién editó por última vez
      updates.lastEditedBy = user.userId;

      await db
        .update(articlesTable)
        .set(updates as Partial<typeof existing>)
        .where(eq(articlesTable.id, id));

      const [full] = await db
        .select(articleSelect)
        .from(articlesTable)
        .leftJoin(
          categoriesTable,
          eq(articlesTable.categoryId, categoriesTable.id),
        )
        .leftJoin(
          secondaryCategoriesTable,
          eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
        )
        .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
        .where(eq(articlesTable.id, id));

      res.json(formatArticle(full as ArticleRow));
    } catch (err) {
      logger.error({ err, articleId: req.params.id }, "Error updating article");
      res.status(500).json({ error: safeError(err) });
    }
  },
);

// Admin: purge articles (requiere confirmación explícita y tiene límite)
router.delete(
  "/admin/articles/purge",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    const { confirm } = (req.body as { confirm?: boolean }) ?? {};

    if (!confirm) {
      res.status(400).json({
        error:
          "Esta acción eliminará TODOS los artículos. Envía { confirm: true } para confirmar.",
      });
      return;
    }

    // Limitar a 100 artículos por llamada para evitar borrados masivos accidentales
    const articles = await db
      .select({ id: articlesTable.id })
      .from(articlesTable)
      .limit(100);

    if (articles.length === 0) {
      res.json({ ok: true, deleted: 0, remaining: 0 });
      return;
    }

    const ids = articles.map((a) => a.id);
    await db.delete(articlesTable).where(inArray(articlesTable.id, ids));

    const [{ count: remaining }] = await db
      .select({ count: count() })
      .from(articlesTable);

    const byUser = (req as any).user;
    logger.warn(
      {
        deletedCount: articles.length,
        remaining: Number(remaining),
        byUserId: byUser?.userId,
      },
      "PURGE: articles deleted",
    );

    res.json({
      ok: true,
      deleted: articles.length,
      remaining: Number(remaining),
      message:
        articles.length === 100
          ? "Se eliminaron 100 artículos. Si quedan más, vuelve a llamar este endpoint."
          : undefined,
    });
  },
);

// Admin: delete article
router.delete(
  "/admin/articles/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);

    const [existing] = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        slug: articlesTable.slug,
      })
      .from(articlesTable)
      .where(eq(articlesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    await db.delete(articlesTable).where(eq(articlesTable.id, id));

    const byUser = (req as any).user;
    logger.info(
      {
        articleId: id,
        title: existing.title,
        slug: existing.slug,
        byUserId: byUser?.userId,
      },
      "Article deleted",
    );

    res.json({ ok: true });
  },
);

// ── Admin: bulk status update ──────────────────────────────────────────────
router.patch(
  "/admin/articles/bulk-status",
  requireAuth,
  requireSuperAdmin,
  async (req, res): Promise<void> => {
    try {
      const { ids, status } = req.body as { ids?: number[]; status?: string };

      if (!Array.isArray(ids) || ids.length === 0) {
        res.status(400).json({ error: "Se requiere un array de IDs." });
        return;
      }
      if (status !== "draft" && status !== "published") {
        res.status(400).json({ error: "Estado inválido. Usa 'draft' o 'published'." });
        return;
      }

      const maxBatch = 100;
      const batchIds = ids.slice(0, maxBatch);

      const user = (req as any).user;
      const now = new Date();

      const publishedAt =
        status === "published" ? now : undefined;

      await db
        .update(articlesTable)
        .set({
          status,
          publishedAt,
          updatedAt: now,
        })
        .where(inArray(articlesTable.id, batchIds));

      logger.info(
        { count: batchIds.length, status, byUserId: user.userId },
        "Bulk status update",
      );

      res.json({
        ok: true,
        updated: batchIds.length,
        status,
        message: `${batchIds.length} artículo(s) actualizado(s) a "${status === "draft" ? "borrador" : "publicado"}".`,
      });
    } catch (err) {
      logger.error({ err }, "Error in bulk status update");
      res.status(500).json({ error: "Error interno del servidor" });
    }
  },
);

// Admin: toggle publish
router.patch(
  "/admin/articles/:id/publish",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);

    const user = (req as any).user;
    const [existing] = await db
      .select({
        id: articlesTable.id,
        title: articlesTable.title,
        slug: articlesTable.slug,
        authorId: articlesTable.authorId,
        status: articlesTable.status,
        featured: articlesTable.featured,
        publishedAt: articlesTable.publishedAt,
        coverImageUrl: articlesTable.coverImageUrl,
        coverImageAlt: articlesTable.coverImageAlt,
      })
      .from(articlesTable)
      .where(eq(articlesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    // Solo el autor o un superadmin pueden editar/borrar
    if (user.role !== "superadmin" && existing.authorId !== user.userId) {
      res
        .status(403)
        .json({
          error:
            "No tienes permiso para realizar esta acción sobre este artículo",
        });
      return;
    }

    const newStatus = existing.status === "published" ? "draft" : "published";
    const publishedAt =
      newStatus === "published" && !existing.publishedAt
        ? new Date()
        : (existing.publishedAt ?? undefined);

    await db
      .update(articlesTable)
      .set({ status: newStatus, publishedAt })
      .where(eq(articlesTable.id, id));

    const [full] = await db
      .select(articleSelect)
      .from(articlesTable)
      .leftJoin(
        categoriesTable,
        eq(articlesTable.categoryId, categoriesTable.id),
      )
      .leftJoin(
        secondaryCategoriesTable,
        eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
      )
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
      .where(eq(articlesTable.id, id));

    res.json(formatArticle(full as ArticleRow));
  },
);

// Admin: toggle featured
router.patch(
  "/admin/articles/:id/feature",
  requireAuth,
  async (req, res): Promise<void> => {
    const rawId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    const id = parseInt(rawId, 10);

    const user = (req as any).user;
    const [existing] = await db
      .select({
        id: articlesTable.id,
        authorId: articlesTable.authorId,
        featured: articlesTable.featured,
      })
      .from(articlesTable)
      .where(eq(articlesTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    // Solo el autor o un superadmin pueden editar/borrar
    if (user.role !== "superadmin" && existing.authorId !== user.userId) {
      res
        .status(403)
        .json({
          error:
            "No tienes permiso para realizar esta acción sobre este artículo",
        });
      return;
    }

    await db
      .update(articlesTable)
      .set({ featured: !existing.featured })
      .where(eq(articlesTable.id, id));

    const [full] = await db
      .select(articleSelect)
      .from(articlesTable)
      .leftJoin(
        categoriesTable,
        eq(articlesTable.categoryId, categoriesTable.id),
      )
      .leftJoin(
        secondaryCategoriesTable,
        eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id),
      )
      .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
      .where(eq(articlesTable.id, id));

    res.json(formatArticle(full as ArticleRow));
  },
);

// ── Popular articles (last 7 days) ──────────────────────────────────────────
router.get("/articles/popular", async (_req: Request, res: Response): Promise<void> => {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const popular = await db
    .select({
      id: articlesTable.id,
      title: articlesTable.title,
      slug: articlesTable.slug,
      summary: articlesTable.summary,
      coverImageUrl: articlesTable.coverImageUrl,
      categoryId: articlesTable.categoryId,
      categoryName: categoriesTable.name,
      categorySlug: categoriesTable.slug,
      categoryColor: categoriesTable.color,
      views: sql<number>`count(${articleViewsTable.id})::int`,
    })
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(articleViewsTable, eq(articlesTable.id, articleViewsTable.articleId))
    .where(
      and(
        eq(articlesTable.status, "published"),
        gte(articleViewsTable.viewedAt, sevenDaysAgo),
      ),
    )
    .groupBy(articlesTable.id, categoriesTable.name, categoriesTable.slug, categoriesTable.color)
    .orderBy(desc(sql`count(${articleViewsTable.id})`))
    .limit(5);

  res.json(popular.map((a) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    summary: a.summary,
    coverImageUrl: a.coverImageUrl,
    category: a.categoryId
      ? { id: a.categoryId, name: a.categoryName, slug: a.categorySlug, color: a.categoryColor }
      : null,
    views: a.views,
  })));
});

// ── Track article view ───────────────────────────────────────────────────────
router.post("/articles/:slug/view", async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;

  const [article] = await db
    .select({ id: articlesTable.id })
    .from(articlesTable)
    .where(eq(articlesTable.slug, slug));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  const ipHash = crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16);

  // Upsert: insert view record, skip if duplicate (same ip + article + day)
  try {
    await db.insert(articleViewsTable).values({
      articleId: article.id,
      ipHash,
    });
  } catch {
    // Duplicate (unique constraint) — silently ignore
  }

  res.json({ ok: true });
});

// ── Preview article (requires auth, shows any status) ────────────────────────
router.get("/articles/preview/:slug", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const user = (req as any).user;

  const [article] = await db
    .select(articleSelect)
    .from(articlesTable)
    .leftJoin(categoriesTable, eq(articlesTable.categoryId, categoriesTable.id))
    .leftJoin(secondaryCategoriesTable, eq(articlesTable.secondaryCategoryId, secondaryCategoriesTable.id))
    .leftJoin(usersTable, eq(articlesTable.authorId, usersTable.id))
    .where(eq(articlesTable.slug, slug));

  if (!article) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  // Solo el autor o admin/superadmin pueden ver preview
  const canPreview =
    user.role === "superadmin" ||
    user.role === "admin" ||
    article.authorId === user.userId;

  if (!canPreview) {
    res.status(403).json({ error: "No tienes permiso para ver este artículo" });
    return;
  }

  res.json(formatArticle(article as ArticleRow));
});

export default router;
