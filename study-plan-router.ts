import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  studyPlans,
  studyPlanDays,
  categories,
  subTopics,
} from "@db/schema";

export const studyPlanRouter = createRouter({
  // Get or create study plan
  getOrCreate: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const existing = await db
      .select()
      .from(studyPlans)
      .where(
        and(
          eq(studyPlans.userId, ctx.user.id),
          eq(studyPlans.isActive, true)
        )
      )
      .limit(1);

    if (existing[0]) {
      const days = await db
        .select()
        .from(studyPlanDays)
        .where(eq(studyPlanDays.planId, existing[0].id))
        .orderBy(asc(studyPlanDays.dayNumber));

      return { plan: existing[0], days };
    }

    // Create a new 30-day plan
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + 30);

    const result = await db.insert(studyPlans).values({
      userId: ctx.user.id,
      title: "30-Day Psychometric Mastery",
      startDate: now,
      targetDate,
      targetScore: 85,
      currentDay: 1,
      isActive: true,
    });

    const planId = Number(result[0].insertId);

    // Generate 30 days of study content
    await generateStudyDays(db, planId);

    // Query back with IDs
    const plan = await db
      .select()
      .from(studyPlans)
      .where(eq(studyPlans.id, planId))
      .limit(1);

    const days = await db
      .select()
      .from(studyPlanDays)
      .where(eq(studyPlanDays.planId, planId))
      .orderBy(asc(studyPlanDays.dayNumber));

    return { plan: plan[0], days };
  }),

  // Mark a day as completed
  completeDay: authedQuery
    .input(
      z.object({
        dayId: z.number(),
        taskIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const day = await db
        .select()
        .from(studyPlanDays)
        .where(eq(studyPlanDays.id, input.dayId))
        .limit(1);

      if (!day[0]) return { success: false };

      // Update task completion
      if (input.taskIds && day[0].tasks) {
        const updatedTasks = day[0].tasks.map((task: any) => ({
          ...task,
          completed: input.taskIds?.includes(task.id) || task.completed,
        }));

        await db
          .update(studyPlanDays)
          .set({
            tasks: updatedTasks,
            isCompleted: updatedTasks.every((t: any) => t.completed),
            completedAt: updatedTasks.every((t: any) => t.completed)
              ? new Date()
              : day[0].completedAt,
          })
          .where(eq(studyPlanDays.id, input.dayId));
      } else {
        await db
          .update(studyPlanDays)
          .set({
            isCompleted: true,
            completedAt: new Date(),
          })
          .where(eq(studyPlanDays.id, input.dayId));
      }

      // Update plan current day
      const plan = await db
        .select()
        .from(studyPlans)
        .where(eq(studyPlans.id, day[0].planId))
        .limit(1);

      if (plan[0]) {
        await db
          .update(studyPlans)
          .set({
            currentDay: Math.min(day[0].dayNumber + 1, 30),
          })
          .where(eq(studyPlans.id, plan[0].id));
      }

      return { success: true };
    }),

  // Get a specific day
  getDay: authedQuery
    .input(z.object({ dayId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const day = await db
        .select()
        .from(studyPlanDays)
        .where(eq(studyPlanDays.id, input.dayId))
        .limit(1);
      return day[0] || null;
    }),

  // Get plan progress stats
  progress: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const plan = await db
      .select()
      .from(studyPlans)
      .where(
        and(
          eq(studyPlans.userId, ctx.user.id),
          eq(studyPlans.isActive, true)
        )
      )
      .limit(1);

    if (!plan[0]) return null;

    const days = await db
      .select()
      .from(studyPlanDays)
      .where(eq(studyPlanDays.planId, plan[0].id));

    const completed = days.filter((d) => d.isCompleted).length;
    const totalTasks = days.reduce(
      (acc, d) => acc + (d.tasks?.length || 0),
      0
    );
    const completedTasks = days.reduce(
      (acc, d) =>
        acc + (d.tasks?.filter((t: any) => t.completed).length || 0),
      0
    );

    return {
      totalDays: days.length,
      completedDays: completed,
      completionRate: Math.round((completed / days.length) * 100),
      totalTasks,
      completedTasks,
      taskCompletionRate:
        totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
      currentDay: plan[0].currentDay,
      daysLeft: Math.max(0, 30 - completed),
    };
  }),
});

// Generate a structured 30-day study plan
async function generateStudyDays(
  db: ReturnType<typeof getDb>,
  planId: number
) {
  const cats = await db.select().from(categories);
  const subs = await db.select().from(subTopics);

  const daysData = [];

  // Week 1: Foundation (Days 1-7) - Easy questions, all categories
  for (let i = 1; i <= 7; i++) {
    const catIndex = (i - 1) % cats.length;
    const category = cats[catIndex];
    const categorySubs = subs.filter((s) => s.categoryId === category?.id);

    daysData.push({
      planId,
      dayNumber: i,
      title: `Foundation: ${category?.name || "General"} Basics`,
      description: `Build foundational skills in ${category?.name || "core concepts"}. Focus on understanding the basic patterns and problem types.`,
      focusAreas: [category?.slug || "general"],
      tasks: [
        {
          id: `d${i}_t1`,
          title: `Learn ${category?.name || "Concepts"} Fundamentals`,
          type: "lesson" as const,
          completed: false,
          durationMinutes: 15,
        },
        {
          id: `d${i}_t2`,
          title: `Practice ${categorySubs[0]?.name || "Basic Questions"}`,
          type: "practice" as const,
          completed: false,
          durationMinutes: 20,
          subTopicId: categorySubs[0]?.id,
        },
        {
          id: `d${i}_t3`,
          title: `Mini Quiz (5 Questions)`,
          type: "mock_test" as const,
          completed: false,
          durationMinutes: 10,
        },
      ],
      scheduledDate: new Date(Date.now() + (i - 1) * 86400000),
    });
  }

  // Week 2: Building (Days 8-14) - Medium questions, mixed practice
  for (let i = 8; i <= 14; i++) {
    const focusCats = cats.slice(0, 2);
    daysData.push({
      planId,
      dayNumber: i,
      title: `Building: Mixed ${focusCats.map((c) => c.name).join(" & ")}`,
      description: `Intermediate practice combining multiple skill areas. Focus on speed and accuracy.`,
      focusAreas: focusCats.map((c) => c.slug),
      tasks: [
        {
          id: `d${i}_t1`,
          title: "Review Weak Areas",
          type: "review" as const,
          completed: false,
          durationMinutes: 10,
        },
        {
          id: `d${i}_t2`,
          title: "Mixed Practice Set",
          type: "practice" as const,
          completed: false,
          durationMinutes: 25,
        },
        {
          id: `d${i}_t3`,
          title: "Timed Block (10 Questions)",
          type: "mock_test" as const,
          completed: false,
          durationMinutes: 15,
        },
      ],
      scheduledDate: new Date(Date.now() + (i - 1) * 86400000),
    });
  }

  // Week 3: Intensification (Days 15-21) - Hard questions, full mocks
  for (let i = 15; i <= 21; i++) {
    daysData.push({
      planId,
      dayNumber: i,
      title: "Intensification: Full Mock Practice",
      description: `Full-length timed practice sessions under realistic conditions. Build test-taking stamina.`,
      focusAreas: cats.map((c) => c.slug),
      tasks: [
        {
          id: `d${i}_t1`,
          title: "Quick Review",
          type: "review" as const,
          completed: false,
          durationMinutes: 5,
        },
        {
          id: `d${i}_t2`,
          title: "Full Mock Test (20 Questions)",
          type: "mock_test" as const,
          completed: false,
          durationMinutes: 30,
        },
        {
          id: `d${i}_t3`,
          title: "Error Analysis",
          type: "review" as const,
          completed: false,
          durationMinutes: 15,
        },
      ],
      scheduledDate: new Date(Date.now() + (i - 1) * 86400000),
    });
  }

  // Week 4: Peak Performance (Days 22-30) - Mixed difficulty, exam simulation
  for (let i = 22; i <= 30; i++) {
    const isFinalDay = i === 30;
    daysData.push({
      planId,
      dayNumber: i,
      title: isFinalDay
        ? "Final Exam Simulation"
        : `Peak: Day ${i} - Exam Conditioning`,
      description: isFinalDay
        ? "Complete exam simulation under full test conditions. This is your final rehearsal."
        : "Maintain peak performance with targeted practice and strategic review.",
      focusAreas: cats.map((c) => c.slug),
      tasks: [
        {
          id: `d${i}_t1`,
          title: "Strategic Review",
          type: "review" as const,
          completed: false,
          durationMinutes: 10,
        },
        {
          id: `d${i}_t2`,
          title: isFinalDay
            ? "Full Exam Simulation (30 min)"
            : "Adaptive Practice Block",
          type: "mock_test" as const,
          completed: false,
          durationMinutes: isFinalDay ? 35 : 25,
        },
        {
          id: `d${i}_t3`,
          title: "Final Review & Strategy",
          type: "review" as const,
          completed: false,
          durationMinutes: 15,
        },
      ],
      scheduledDate: new Date(Date.now() + (i - 1) * 86400000),
    });
  }

  await db.insert(studyPlanDays).values(daysData);

  return daysData;
}
