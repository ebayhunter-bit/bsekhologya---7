import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { chatMessages, questions } from "@db/schema";
import { env } from "./lib/env";

export const tutorRouter = createRouter({
  // Get chat history
  history: authedQuery
    .input(
      z
        .object({
          contextType: z.string().optional(),
          limit: z.number().default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(chatMessages.userId, ctx.user.id)];

      if (input?.contextType) {
        conditions.push(eq(chatMessages.contextType, input.contextType));
      }

      return db
        .select()
        .from(chatMessages)
        .where(and(...conditions))
        .orderBy(desc(chatMessages.createdAt))
        .limit(input?.limit || 50);
    }),

  // Send a message to the AI tutor
  ask: authedQuery
    .input(
      z.object({
        message: z.string().min(1),
        contextType: z
          .enum(["general", "question_explanation", "study_plan"])
          .default("general"),
        contextId: z.number().optional(),
        questionId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Store user message
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "user",
        content: input.message,
        contextType: input.contextType,
        contextId: input.contextId,
      });

      // Build system prompt
      const systemPrompt = `You are Dr. Sigma, an expert psychometric reasoning coach. You help students prepare for cognitive ability assessments (numerical, logical, and abstract reasoning tests).

Your teaching style:
- Be concise but thorough. Use step-by-step breakdowns.
- Always explain the "why" behind the answer, not just the "what".
- Use clear formatting with bullet points and numbered steps.
- Adapt your explanation depth to the student's question.
- Encourage the student and build their confidence.
- When explaining math, show all working clearly.
- For pattern questions, describe the transformation rules explicitly.
- If the student is struggling, break the problem into smaller parts.

You can help with:
- Numerical reasoning (percentages, ratios, sequences, data interpretation)
- Abstract reasoning (pattern recognition, shape transformations, analogies)
- Logical reasoning (deductions, syllogisms, verbal analogies)
- Study strategies and test-taking techniques
- Time management during tests`;

      // If there's a question context, fetch it
      let questionContext = "";
      if (input.questionId) {
        const q = await db
          .select()
          .from(questions)
          .where(eq(questions.id, input.questionId))
          .limit(1);

        if (q[0]) {
          questionContext = `
The student is asking about this specific question:
Question: ${q[0].questionText}
Correct Answer: ${q[0].options[q[0].correctAnswer]}
Explanation: ${q[0].explanation}`;
        }
      }

      // Call Kimi AI API
      let aiResponse = "";
      try {
        const resp = await fetch(`${env.kimiOpenUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.appSecret}`,
          },
          body: JSON.stringify({
            model: "kimi-latest",
            messages: [
              { role: "system", content: systemPrompt },
              ...(questionContext
                ? [
                    {
                      role: "user" as const,
                      content: questionContext,
                    },
                  ]
                : []),
              { role: "user", content: input.message },
            ],
            temperature: 0.7,
            max_tokens: 800,
          }),
        });

        if (resp.ok) {
          const data = (await resp.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          aiResponse =
            data.choices?.[0]?.message?.content ||
            "I'm sorry, I couldn't generate a response. Please try again.";
        } else {
          aiResponse = generateFallbackResponse(input.message);
        }
      } catch {
        aiResponse = generateFallbackResponse(input.message);
      }

      // Store AI response
      await db.insert(chatMessages).values({
        userId: ctx.user.id,
        role: "assistant",
        content: aiResponse,
        contextType: input.contextType,
        contextId: input.contextId,
      });

      return { response: aiResponse };
    }),

  // Clear chat history
  clear: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    await db
      .delete(chatMessages)
      .where(eq(chatMessages.userId, ctx.user.id));
    return { success: true };
  }),
});

function generateFallbackResponse(message: string): string {
  const lowerMsg = message.toLowerCase();

  if (
    lowerMsg.includes("sequence") ||
    lowerMsg.includes("pattern") ||
    lowerMsg.includes("next number")
  ) {
    return `To solve sequence problems, follow these steps:

1. **Look for simple patterns first**: Check if the sequence increases by a constant amount (arithmetic) or is multiplied by a constant (geometric).

2. **Check second-order patterns**: If simple differences don't work, look at the *differences between differences*.

3. **Consider alternating patterns**: Some sequences use two alternating rules.

4. **Look for square/cube numbers**: Sequences like 1, 4, 9, 16, 25 are perfect squares.

5. **Test your pattern**: Once you think you've found the rule, apply it to check if it works for all given terms.

Try identifying the relationship between consecutive terms first. What do you notice?`;
  }

  if (lowerMsg.includes("percentage") || lowerMsg.includes("percent")) {
    return `For percentage problems, remember these key formulas:

1. **Percentage of a number**: (Percentage / 100) x Total
   Example: 20% of 150 = (20/100) x 150 = 30

2. **Percentage increase**: ((New - Original) / Original) x 100
   Example: From 80 to 100 = ((100-80)/80) x 100 = 25% increase

3. **Finding original amount**: If X% of a number is Y, the number = (Y x 100) / X

**Pro tip**: Always identify what is the "base" or "original" value. The percentage is always calculated relative to this base.`;
  }

  if (lowerMsg.includes("ratio") || lowerMsg.includes("proportion")) {
    return `Working with ratios and proportions:

1. **Simplify ratios**: Divide both sides by their GCD. 12:18 simplifies to 2:3.

2. **Dividing by a ratio**: If $600 is split 3:2, there are 5 parts total. Each part = $120. So 3 parts = $360, 2 parts = $240.

3. **Proportions**: If A/B = C/D, then A x D = B x C (cross-multiplication).

4. **Inverse proportion**: One value increases as the other decreases (y = k/x). Common in work-rate problems.`;
  }

  if (
    lowerMsg.includes("shape") ||
    lowerMsg.includes("abstract") ||
    lowerMsg.includes("pattern")
  ) {
    return `For abstract reasoning patterns, analyze these transformation rules:

1. **Rotation**: Shapes may rotate by a fixed angle (45, 90, 180 degrees) each step.

2. **Size changes**: Shapes may grow, shrink, or alternate in size.

3. **Position shifts**: Elements may move clockwise/anti-clockwise around a grid.

4. **Shape transformation**: One shape type may transform into another.

5. **Color/line changes**: Fill color, outline thickness, or line style may follow a pattern.

**Strategy**: Compare row-to-row and column-to-column. Ask: "What stays the same? What changes? How does it change?"`;
  }

  return `That's a great question! Let me break this down for you.

The key to solving psychometric reasoning questions is to:

1. **Read carefully** - identify exactly what information you have and what you're being asked to find.

2. **Identify the pattern or rule** - whether it's a numerical sequence, a shape transformation, or a logical deduction, there's always an underlying rule.

3. **Work systematically** - don't rush. Break complex problems into smaller steps.

4. **Check your answer** - once you find an answer, verify it against all given information.

What specific type of question are you working on? I can give you more targeted advice!`;
}
