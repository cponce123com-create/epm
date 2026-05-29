/**
 * Tipos compartidos para el módulo de noticias externas (RSS aggregator).
 */

export interface RssSource {
  name: string;
  url: string;
  siteUrl: string;
  language: "es" | "en" | "pt";
  bias?: "left" | "center-left" | "center" | "center-right" | "right" | "independent";
  category: string;
}

export interface ExternalHeadline {
  id?: number;
  title: string;
  link: string;
  source: string;
  sourceBias: string | null;
  summary: string | null;
  pubDate: Date;
  fetchedAt?: Date;
}

export interface DailyBriefing {
  id?: number;
  briefingDate: string;
  content: string;
  createdAt?: Date;
}

export interface ArticleSummary {
  id?: number;
  articleId: number;
  summary: string;
  createdAt?: Date;
}

export interface TrendWord {
  word: string;
  count: number;
}
