import { z } from "zod";
import { eq, and, desc, gte } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  testSessions,
  userProgress,
  categories,
  dailyStreaks,
} from "@db/schema";

export const analyticsRouter = createRouter({
  // Get overall performance summary
  summary: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    // Total sessions and average score
    const sessions = await db
      .select()
      .from(testSessions)
      .where(
        and(
          eq(testSessions.userId, userId),
          eq(testSessions.status, "completed")
        )
      )
      .orderBy(desc(testSessions.startedAt));

    const totalTests = sessions.length;
    const avgScore =
      totalTests > 0
        ? Math.round(
            sessions.reduce((acc, s) => acc + (s.score || 0), 0) / totalTests
          )
        : 0;
    const bestScore =
      totalTests > 0
        ? Math.max(...sessions.map((s) => s.score || 0))
        : 0;

    // Progress by category
    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    const categoryProgress = await Promise.all(
      progress.map(async (p) => {
        const cat = await db
          .select()
          .from(categories)
          .where(eq(categories.id, p.categoryId))
          .limit(1);
        const attempted = p.questionsAttempted ?? 0;
        const correct = p.questionsCorrect ?? 0;
        return {
          category: cat[0]?.name || "Unknown",
          categoryId: p.categoryId,
          attempted,
          correct,
          accuracy: attempted > 0 ? Math.round((correct / attempted) * 100) : 0,
          avgTime: Math.round(p.averageTimeSeconds ?? 0),
          mastery: p.masteryLevel,
        };
      })
    );

    // Score trend (last 10 sessions)
    const scoreTrend = sessions
      .slice(0, 10)
      .reverse()
      .map((s, i) => ({
        session: i + 1,
        score: s.score || 0,
        date: s.completedAt?.toISOString().split("T")[0] || "",
      }));

    // Study streak
    const streaks = await db
      .select()
      .from(dailyStreaks)
      .where(eq(dailyStreaks.userId, userId))
      .orderBy(desc(dailyStreaks.date));

    const currentStreak = calculateStreak(streaks);

    return {
      totalTests,
      avgScore,
      bestScore,
      categoryProgress,
      scoreTrend,
      currentStreak,
      totalQuestionsAnswered: progress.reduce(
        (acc, p) => acc + (p.questionsAttempted ?? 0),
        0
      ),
    };
  }),

  // Get speed vs accuracy scatter data
  speedAccuracy: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const sessions = await db
      .select()
      .from(testSessions)
      .where(
        and(
          eq(testSessions.userId, userId),
          eq(testSessions.status, "completed")
        )
      )
      .limit(20);

    const data = sessions.map((s) => ({
      avgTimePerQuestion: s.totalQuestions
        ? Math.round((s.timeUsedSeconds || 0) / s.totalQuestions)
        : 0,
      score: s.score || 0,
      date: s.completedAt?.toISOString().split("T")[0] || "",
    }));

    return data;
  }),

  // Get error analysis (weak areas)
  weakAreas: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    const progress = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));

    const weakAreas = await Promise.all(
      progress
        .filter((p) => (p.questionsAttempted ?? 0) > 0)
        .map(async (p) => {
          const cat = await db
            .select()
            .from(categories)
            .where(eq(categories.id, p.categoryId))
            .limit(1);

          const attempted = p.questionsAttempted ?? 0;
          const correct = p.questionsCorrect ?? 0;
          const accuracy = attempted > 0 ? correct / attempted : 0;

          return {
            category: cat[0]?.name || "Unknown",
            accuracy: Math.round(accuracy * 100),
            attempted,
            correct,
          };
        })
    );

    // Sort by accuracy ascending (weakest first)
    weakAreas.sort((a, b) => a.accuracy - b.accuracy);

    return weakAreas.slice(0, 5);
  }),

  // Get daily activity for calendar heatmap
  dailyActivity: authedQuery
    .input(
      z
        .object({
          days: z.number().default(30),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = ctx.user.id;

      const days = input?.days || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);

      const streaks = await db
        .select()
        .from(dailyStreaks)
        .where(
          and(
            eq(dailyStreaks.userId, userId),
            gte(dailyStreaks.date, since.toISOString().split("T")[0])
          )
        )
        .orderBy(desc(dailyStreaks.date));

      return streaks.map((s) => ({
        date: s.date,
        questions: s.questionsAnswered || 0,
        minutes: s.minutesStudied || 0,
        intensity:
          (s.questionsAnswered || 0) > 20
            ? 4
            : (s.questionsAnswered || 0) > 10
              ? 3
              : (s.questionsAnswered || 0) > 5
                ? 2
                : (s.questionsAnswered || 0) > 0
                  ? 1
                  : 0,
      }));
    }),

  // Log daily activity
  logActivity: authedQuery
    .input(
      z.object({
        questionsAnswered: z.number(),
        minutesStudied: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const today = new Date().toISOString().split("T")[0];

      const existing = await db
        .select()
        .from(dailyStreaks)
        .where(
          and(
            eq(dailyStreaks.userId, ctx.user.id),
            eq(dailyStreaks.date, today)
          )
        )
        .limit(1);

      if (existing[0]) {
        await db
          .update(dailyStreaks)
          .set({
            questionsAnswered:
              (existing[0].questionsAnswered ?? 0) + input.questionsAnswered,
            minutesStudied:
              (existing[0].minutesStudied ?? 0) + input.minutesStudied,
          })
          .where(eq(dailyStreaks.id, existing[0].id));
      } else {
        await db.insert(dailyStreaks).values({
          userId: ctx.user.id,
          date: today,
          questionsAnswered: input.questionsAnswered,
          minutesStudied: input.minutesStudied,
        });
      }

      return { success: true };
    }),
});

function calculateStreak(
  streaks: Array<{ date: string }>
): number {
  if (streaks.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if there's activity today or yesterday
  const todayStr = today.toISOString().split("T")[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const hasToday = streaks.some((s) => s.date === todayStr);
  const hasYesterday = streaks.some((s) => s.date === yesterdayStr);

  if (!hasToday && !hasYesterday) return 0;

  // Count consecutive days
  const dateSet = new Set(streaks.map((s) => s.date));
  const checkDate = hasToday ? new Date(today) : new Date(yesterday);

  while (dateSet.has(checkDate.toISOString().split("T")[0])) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
