import { generateMockArticles, MOCK_ARTICLE_COUNT } from "./generate-articles";

/** 首页使用的 192 篇 mock 文章（模拟后端全量数据） */
export const articles = generateMockArticles(MOCK_ARTICLE_COUNT);
