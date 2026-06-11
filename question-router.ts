import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { questions, categories, subTopics } from "@db/schema";

export const questionRouter = createRouter({
  // Get questions with filters (supports adaptive difficulty)
  list: publicQuery
    .input(
      z.object({
        categoryId: z.number().optional(),
        type: z.string().optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).optional(),
        subTopicId: z.number().optional(),
        limit: z.number().min(1).max(50).default(20),
        excludeIds: z.array(z.number()).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const filters = [];

      if (input?.categoryId) {
        filters.push(eq(questions.categoryId, input.categoryId));
      }
      if (input?.type) {
        filters.push(eq(questions.type, input.type as any));
      }
      if (input?.difficulty) {
        filters.push(eq(questions.difficulty, input.difficulty));
      }
      if (input?.subTopicId) {
        filters.push(eq(questions.subTopicId, input.subTopicId));
      }
      if (input?.excludeIds && input.excludeIds.length > 0) {
        filters.push(sql`${questions.id} NOT IN (${sql.join(input.excludeIds, sql`, `)})`);
      }

      const condition = filters.length > 0 ? and(...filters) : undefined;

      const result = await db
        .select()
        .from(questions)
        .where(condition)
        .limit(input?.limit || 20)
        .orderBy(sql`RAND()`);

      return result;
    }),

  // Get a single question by ID
  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(questions)
        .where(eq(questions.id, input.id))
        .limit(1);
      return result[0] || null;
    }),

  // Get adaptive questions based on user performance
  getAdaptive: authedQuery
    .input(
      z.object({
        categoryId: z.number().optional(),
        count: z.number().min(1).max(30).default(10),
        focusAreas: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const userId = ctx.user.id;

      // Get user's progress to determine difficulty
      const progress = await db.query.userProgress.findMany({
        where: (up, { eq }) => eq(up.userId, userId),
      });

      // Simple adaptive logic: if user has >70% accuracy, give harder questions
      const avgMastery =
        progress.length > 0
          ? progress.reduce((acc, p) => {
              const attempted = p.questionsAttempted ?? 0;
              const correct = p.questionsCorrect ?? 0;
              const score = attempted > 0 ? correct / attempted : 0;
              return acc + score;
            }, 0) / progress.length
          : 0.5;

      let targetDifficulty: "easy" | "medium" | "hard" = "medium";
      if (avgMastery > 0.75) targetDifficulty = "hard";
      else if (avgMastery < 0.5) targetDifficulty = "easy";

      const filters = [eq(questions.difficulty, targetDifficulty)];
      if (input.categoryId) {
        filters.push(eq(questions.categoryId, input.categoryId));
      }

      const result = await db
        .select()
        .from(questions)
        .where(and(...filters))
        .limit(input.count)
        .orderBy(sql`RAND()`);

      return {
        questions: result,
        difficulty: targetDifficulty,
        avgMastery,
      };
    }),

  // Get all categories
  categories: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(categories);
  }),

  // Get sub-topics for a category
  subTopics: publicQuery
    .input(z.object({ categoryId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(subTopics)
        .where(eq(subTopics.categoryId, input.categoryId))
        .orderBy(subTopics.order);
    }),
});
