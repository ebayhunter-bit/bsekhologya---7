import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  testSessions,
  sessionAnswers,
  questions,
  userProgress,
} from "@db/schema";

export const sessionRouter = createRouter({
  // Create a new test session
  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1),
        categoryFilter: z.string().optional(),
        difficultyMode: z
          .enum(["adaptive", "easy", "medium", "hard", "mixed"])
          .default("adaptive"),
        totalQuestions: z.number().min(5).max(50).default(20),
        timeLimitMinutes: z.number().min(5).max(120).default(30),
        questionIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(testSessions).values({
        userId: ctx.user.id,
        title: input.title,
        categoryFilter: input.categoryFilter,
        difficultyMode: input.difficultyMode,
        totalQuestions: input.totalQuestions,
        timeLimitMinutes: input.timeLimitMinutes,
        questionIds: input.questionIds,
        status: "in_progress",
      });
      return { sessionId: Number(result[0].insertId) };
    }),

  // Get a session by ID
  byId: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const session = await db
        .select()
        .from(testSessions)
        .where(
          and(
            eq(testSessions.id, input.id),
            eq(testSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) return null;

      const answers = await db
        .select()
        .from(sessionAnswers)
        .where(eq(sessionAnswers.sessionId, input.id));

      return { ...session[0], answers };
    }),

  // Submit an answer
  submitAnswer: authedQuery
    .input(
      z.object({
        sessionId: z.number(),
        questionId: z.number(),
        selectedAnswer: z.number(),
        timeTakenSeconds: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Get the question to check correctness
      const question = await db
        .select()
        .from(questions)
        .where(eq(questions.id, input.questionId))
        .limit(1);

      if (!question[0]) {
        throw new Error("Question not found");
      }

      const isCorrect = question[0].correctAnswer === input.selectedAnswer;

      // Insert the answer
      await db.insert(sessionAnswers).values({
        sessionId: input.sessionId,
        questionId: input.questionId,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
        timeTakenSeconds: input.timeTakenSeconds,
      });

      // Update session stats
      const currentSession = await db
        .select()
        .from(testSessions)
        .where(eq(testSessions.id, input.sessionId))
        .limit(1);

      if (currentSession[0]) {
        const answered = (currentSession[0].questionsAnswered || 0) + 1;
        const correct =
          (currentSession[0].correctAnswers || 0) + (isCorrect ? 1 : 0);
        const total = currentSession[0].totalQuestions || 1;
        const score = Math.round((correct / total) * 100);

        await db
          .update(testSessions)
          .set({
            questionsAnswered: answered,
            correctAnswers: correct,
            score,
            timeUsedSeconds:
              (currentSession[0].timeUsedSeconds || 0) +
              input.timeTakenSeconds,
          })
          .where(eq(testSessions.id, input.sessionId));

        // Update user progress
        await updateUserProgress(
          db,
          ctx.user.id,
          question[0].categoryId,
          question[0].subTopicId,
          isCorrect,
          input.timeTakenSeconds
        );
      }

      return {
        isCorrect,
        correctAnswer: question[0].correctAnswer,
        explanation: question[0].explanation,
      };
    }),

  // Complete a session
  complete: authedQuery
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db
        .update(testSessions)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(
          and(
            eq(testSessions.id, input.sessionId),
            eq(testSessions.userId, ctx.user.id)
          )
        );
      return { success: true };
    }),

  // Get user's recent sessions
  recent: authedQuery
    .input(z.object({ limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      return db
        .select()
        .from(testSessions)
        .where(eq(testSessions.userId, ctx.user.id))
        .orderBy(desc(testSessions.startedAt))
        .limit(input?.limit || 10);
    }),

  // Get detailed session results with question data
  results: authedQuery
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      const session = await db
        .select()
        .from(testSessions)
        .where(
          and(
            eq(testSessions.id, input.sessionId),
            eq(testSessions.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!session[0]) return null;

      const answers = await db
        .select()
        .from(sessionAnswers)
        .where(eq(sessionAnswers.sessionId, input.sessionId));

      // Get question details for each answer
      const answersWithQuestions = await Promise.all(
        answers.map(async (answer) => {
          const q = await db
            .select()
            .from(questions)
            .where(eq(questions.id, answer.questionId))
            .limit(1);
          return {
            ...answer,
            question: q[0] || null,
          };
        })
      );

      return {
        ...session[0],
        answers: answersWithQuestions,
      };
    }),
});

// Helper to update user progress
async function updateUserProgress(
  db: ReturnType<typeof getDb>,
  userId: number,
  categoryId: number,
  subTopicId: number | null,
  isCorrect: boolean,
  timeTakenSeconds: number
) {
  // Check if progress record exists
  const existing = await db
    .select()
    .from(userProgress)
    .where(
      and(
        eq(userProgress.userId, userId),
        eq(userProgress.categoryId, categoryId)
      )
    )
    .limit(1);

  if (existing[0]) {
    const prevAttempted = existing[0].questionsAttempted ?? 0;
    const prevCorrect = existing[0].questionsCorrect ?? 0;
    const prevAvgTime = existing[0].averageTimeSeconds ?? 0;
    const attempted = prevAttempted + 1;
    const correct = prevCorrect + (isCorrect ? 1 : 0);
    const accuracy = correct / attempted;
    const avgTime =
      (prevAvgTime * prevAttempted + timeTakenSeconds) / attempted;

    // Determine mastery level
    let mastery: "beginner" | "developing" | "proficient" | "advanced" | "mastered" =
      "beginner";
    if (accuracy >= 0.9 && attempted >= 10) mastery = "mastered";
    else if (accuracy >= 0.8 && attempted >= 8) mastery = "advanced";
    else if (accuracy >= 0.7 && attempted >= 5) mastery = "proficient";
    else if (accuracy >= 0.5 && attempted >= 3) mastery = "developing";

    await db
      .update(userProgress)
      .set({
        questionsAttempted: attempted,
        questionsCorrect: correct,
        averageTimeSeconds: avgTime,
        masteryLevel: mastery,
        lastStudiedAt: new Date(),
      })
      .where(eq(userProgress.id, existing[0].id));
  } else {
    await db.insert(userProgress).values({
      userId,
      categoryId,
      subTopicId,
      questionsAttempted: 1,
      questionsCorrect: isCorrect ? 1 : 0,
      averageTimeSeconds: timeTakenSeconds,
      masteryLevel: isCorrect ? "developing" : "beginner",
    });
  }
}
