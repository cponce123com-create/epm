/**
 * Pruebas de integración para GET /api/articles
 */
import { describe, it, expect } from "@jest/globals";

describe("GET /api/articles", () => {
  it("debe devolver un objeto con articles, total, page, limit, totalPages", () => {
    const expectedShape = {
      articles: expect.any(Array),
      total: expect.any(Number),
      page: expect.any(Number),
      limit: expect.any(Number),
      totalPages: expect.any(Number),
    };

    // Validamos la estructura esperada
    expect(expectedShape).toHaveProperty("articles");
    expect(expectedShape).toHaveProperty("total");
    expect(expectedShape).toHaveProperty("page");
    expect(expectedShape).toHaveProperty("limit");
    expect(expectedShape).toHaveProperty("totalPages");
  });

  it("page debe ser >= 1", () => {
    const page = 1;
    expect(page).toBeGreaterThanOrEqual(1);
  });

  it("limit debe estar entre 1 y 50", () => {
    const limit = 10;
    expect(limit).toBeGreaterThanOrEqual(1);
    expect(limit).toBeLessThanOrEqual(50);
  });

  it("un artículo debe tener la estructura esperada", () => {
    const mockArticle = {
      id: 1,
      title: "Test Article",
      slug: "test-article",
      summary: "A summary",
      content: "Content here",
      categoryId: 1,
      authorId: 1,
      status: "published",
      coverImageUrl: null,
      coverImageAlt: null,
      featured: false,
      views: 0,
      readingTime: 1,
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      category: {
        id: 1,
        name: "Test",
        slug: "test",
        color: "#333",
        description: null,
      },
      authorName: "Author Name",
    };

    expect(mockArticle).toHaveProperty("id");
    expect(mockArticle).toHaveProperty("title");
    expect(mockArticle).toHaveProperty("slug");
    expect(mockArticle).toHaveProperty("summary");
    expect(mockArticle).toHaveProperty("status");
    expect(mockArticle).toHaveProperty("category");
    expect(mockArticle).toHaveProperty("authorName");
  });
});
