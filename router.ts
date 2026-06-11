import { authRouter } from "./auth-router";
import { questionRouter } from "./question-router";
import { sessionRouter } from "./session-router";
import { analyticsRouter } from "./analytics-router";
import { studyPlanRouter } from "./study-plan-router";
import { tutorRouter } from "./tutor-router";
import { seedRouter } from "./seed-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  question: questionRouter,
  session: sessionRouter,
  analytics: analyticsRouter,
  studyPlan: studyPlanRouter,
  tutor: tutorRouter,
  seed: seedRouter,
});

export type AppRouter = typeof appRouter;
