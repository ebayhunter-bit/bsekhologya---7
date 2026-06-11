import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  categories,
  subTopics,
  questions,
} from "@db/schema";

export const seedRouter = createRouter({
  run: publicQuery.mutation(async () => {
    const db = getDb();

    // Check if already seeded
    const existingCats = await db.select().from(categories);
    if (existingCats.length > 0) {
      return { message: "Already seeded", categories: existingCats.length };
    }

    // Seed categories
    await db.insert(categories).values([
      {
        name: "Numerical Reasoning",
        slug: "numerical",
        description: "Mathematical problem solving including percentages, ratios, sequences, and data interpretation.",
        color: "#9eff00",
        icon: "calculator",
      },
      {
        name: "Logical Reasoning",
        slug: "logical",
        description: "Deductive and inductive reasoning including syllogisms, deductions, and verbal analogies.",
        color: "#a855f7",
        icon: "brain",
      },
      {
        name: "Abstract Reasoning",
        slug: "abstract",
        description: "Pattern recognition, shape transformations, and spatial reasoning problems.",
        color: "#f97316",
        icon: "shapes",
      },
    ]);

    // Query back to get IDs
    const seededCats = await db.select().from(categories);
    const numericalId = seededCats.find((c) => c.slug === "numerical")!.id;
    const logicalId = seededCats.find((c) => c.slug === "logical")!.id;
    const abstractId = seededCats.find((c) => c.slug === "abstract")!.id;

    // Seed sub-topics
    await db.insert(subTopics).values([
      { categoryId: numericalId, name: "Number Sequences", slug: "number-sequences", description: "Identify patterns in number series", difficulty: "easy", order: 1 },
      { categoryId: numericalId, name: "Percentage Change", slug: "percentage-change", description: "Calculate increases, decreases, and proportions", difficulty: "easy", order: 2 },
      { categoryId: numericalId, name: "Ratios & Proportions", slug: "ratios-proportions", description: "Work with part-to-part and part-to-whole relationships", difficulty: "medium", order: 3 },
      { categoryId: numericalId, name: "Data Interpretation", slug: "data-interpretation", description: "Analyze charts, tables, and graphs", difficulty: "medium", order: 4 },
      { categoryId: numericalId, name: "Financial Calculations", slug: "financial-calculations", description: "Compound interest, profit/loss, currency conversion", difficulty: "hard", order: 5 },
      { categoryId: logicalId, name: "Syllogisms", slug: "syllogisms", description: "Evaluate logical arguments with major and minor premises", difficulty: "easy", order: 1 },
      { categoryId: logicalId, name: "Deductive Reasoning", slug: "deductive-reasoning", description: "Draw specific conclusions from general statements", difficulty: "medium", order: 2 },
      { categoryId: logicalId, name: "Verbal Analogies", slug: "verbal-analogies", description: "Identify relationships between word pairs", difficulty: "medium", order: 3 },
      { categoryId: logicalId, name: "Logical Puzzles", slug: "logical-puzzles", description: "Multi-step reasoning problems", difficulty: "hard", order: 4 },
      { categoryId: abstractId, name: "Shape Patterns", slug: "shape-patterns", description: "Identify rules governing shape transformations", difficulty: "easy", order: 1 },
      { categoryId: abstractId, name: "Matrix Reasoning", slug: "matrix-reasoning", description: "Complete 3x3 grids of abstract figures", difficulty: "medium", order: 2 },
      { categoryId: abstractId, name: "Spatial Rotation", slug: "spatial-rotation", description: "Mental rotation of 3D objects", difficulty: "hard", order: 3 },
    ]);

    // Query back subTopics
    const seededSubs = await db.select().from(subTopics);
    const numSeqId = seededSubs.find((s) => s.slug === "number-sequences")!.id;
    const pctId = seededSubs.find((s) => s.slug === "percentage-change")!.id;
    const ratioId = seededSubs.find((s) => s.slug === "ratios-proportions")!.id;
    const dataId = seededSubs.find((s) => s.slug === "data-interpretation")!.id;
    const sylId = seededSubs.find((s) => s.slug === "syllogisms")!.id;
    const dedId = seededSubs.find((s) => s.slug === "deductive-reasoning")!.id;
    const verbId = seededSubs.find((s) => s.slug === "verbal-analogies")!.id;
    const shapeId = seededSubs.find((s) => s.slug === "shape-patterns")!.id;
    const matId = seededSubs.find((s) => s.slug === "matrix-reasoning")!.id;
    const spatId = seededSubs.find((s) => s.slug === "spatial-rotation")!.id;
    const logId = seededSubs.find((s) => s.slug === "logical-puzzles")!.id;
    void logId; // reserved for future question sets
    const finId = seededSubs.find((s) => s.slug === "financial-calculations")!.id;
    void finId; // reserved for future question sets

    // Seed questions
    await db.insert(questions).values([
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "easy",
        questionText: "What comes next in the sequence: 2, 6, 12, 20, 30, ?",
        options: ["38", "40", "42", "44"],
        correctAnswer: 2,
        explanation: "The pattern is n(n+1): 1x2=2, 2x3=6, 3x4=12, 4x5=20, 5x6=30, so 6x7=42.",
        timeLimitSeconds: 60,
        tags: ["multiplication", "patterns"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "easy",
        questionText: "Find the next number: 1, 1, 2, 3, 5, 8, ?",
        options: ["11", "12", "13", "14"],
        correctAnswer: 2,
        explanation: "This is the Fibonacci sequence: each number is the sum of the two preceding ones. 5 + 8 = 13.",
        timeLimitSeconds: 45,
        tags: ["fibonacci", "addition"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "easy",
        questionText: "What comes next: 3, 6, 11, 18, 27, ?",
        options: ["36", "38", "40", "42"],
        correctAnswer: 1,
        explanation: "The differences increase by 2 each time: +3, +5, +7, +9, so next is +11. 27 + 11 = 38.",
        timeLimitSeconds: 60,
        tags: ["differences", "patterns"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "medium",
        questionText: "Find the next term: 2, 6, 24, 120, ?",
        options: ["360", "480", "600", "720"],
        correctAnswer: 3,
        explanation: "Factorial pattern: 2=2!, 6=3!, 24=4!, 120=5!, so next is 6! = 720.",
        timeLimitSeconds: 75,
        tags: ["factorial", "multiplication"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "medium",
        questionText: "What comes next: 1, 4, 27, 256, ?",
        options: ["625", "1024", "3125", "46656"],
        correctAnswer: 2,
        explanation: "Each term is n^n: 1^1=1, 2^2=4, 3^3=27, 4^4=256, so 5^5=3125.",
        timeLimitSeconds: 90,
        tags: ["exponents", "powers"],
      },
      {
        categoryId: numericalId,
        subTopicId: pctId,
        type: "percentage_change",
        difficulty: "easy",
        questionText: "A laptop costs £800. Its price increases by 15%. What is the new price?",
        options: ["£920", "£915", "£890", "£950"],
        correctAnswer: 0,
        explanation: "15% of £800 = 0.15 x 800 = £120. New price = £800 + £120 = £920.",
        timeLimitSeconds: 60,
        tags: ["percentage", "increase"],
      },
      {
        categoryId: numericalId,
        subTopicId: pctId,
        type: "percentage_change",
        difficulty: "medium",
        questionText: "A stock price falls by 20%, then rises by 25%. What is the net change?",
        options: ["No change", "5% increase", "5% decrease", "10% increase"],
        correctAnswer: 0,
        explanation: "If original price is £100: after 20% fall = £80. After 25% rise on £80 = £100. Net change is 0%.",
        timeLimitSeconds: 90,
        tags: ["percentage", "compound"],
      },
      {
        categoryId: numericalId,
        subTopicId: pctId,
        type: "percentage_change",
        difficulty: "medium",
        questionText: "If 40% of a number is 80, what is 75% of that number?",
        options: ["120", "150", "160", "180"],
        correctAnswer: 1,
        explanation: "If 40% = 80, then 1% = 2, so 100% = 200. 75% of 200 = 150.",
        timeLimitSeconds: 60,
        tags: ["percentage", "reverse"],
      },
      {
        categoryId: numericalId,
        subTopicId: ratioId,
        type: "ratio_proportion",
        difficulty: "medium",
        questionText: "Divide £600 in the ratio 2:3. What is the larger share?",
        options: ["£240", "£300", "£360", "£400"],
        correctAnswer: 2,
        explanation: "Total parts = 2 + 3 = 5. Each part = £120. Larger share = 3 x £120 = £360.",
        timeLimitSeconds: 60,
        tags: ["ratio", "division"],
      },
      {
        categoryId: numericalId,
        subTopicId: ratioId,
        type: "ratio_proportion",
        difficulty: "hard",
        questionText: "If 8 workers can build a wall in 15 days, how many days will 12 workers take?",
        options: ["8 days", "10 days", "12 days", "20 days"],
        correctAnswer: 1,
        explanation: "This is inverse proportion. 8 workers x 15 days = 120 worker-days. 12 workers take 120/12 = 10 days.",
        timeLimitSeconds: 75,
        tags: ["inverse-proportion", "work-rate"],
      },
      {
        categoryId: logicalId,
        subTopicId: sylId,
        type: "syllogism",
        difficulty: "easy",
        questionText: "All roses are flowers. Some flowers fade quickly. Therefore:?",
        options: [
          "All roses fade quickly",
          "Some roses fade quickly",
          "No roses fade quickly",
          "None of the above necessarily follows",
        ],
        correctAnswer: 3,
        explanation: "We know all roses are flowers, and some flowers fade quickly. But we don't know if those 'some flowers' include roses. No conclusion necessarily follows.",
        timeLimitSeconds: 60,
        tags: ["syllogism", "deduction"],
      },
      {
        categoryId: logicalId,
        subTopicId: sylId,
        type: "syllogism",
        difficulty: "medium",
        questionText: "No athletes are lazy. All footballers are athletes. Therefore:?",
        options: [
          "Some footballers are lazy",
          "No footballers are lazy",
          "All lazy people are footballers",
          "Some athletes are not footballers",
        ],
        correctAnswer: 1,
        explanation: "All footballers are athletes, and no athletes are lazy. Therefore, no footballers can be lazy. This follows necessarily.",
        timeLimitSeconds: 60,
        tags: ["syllogism", "categorical"],
      },
      {
        categoryId: logicalId,
        subTopicId: dedId,
        type: "logical_deduction",
        difficulty: "medium",
        questionText: "Five people (A, B, C, D, E) sit in a row. A is not at either end. B sits immediately to the right of C. D is at the left end. Who is at the right end?",
        options: ["A", "B", "C", "E"],
        correctAnswer: 3,
        explanation: "D is at position 1 (left end). B is immediately right of C, so CB is a pair. A is not at position 5. Arrangement: D-C-B-A-E or D-A-C-B-E. In both, E is at the right end.",
        timeLimitSeconds: 120,
        tags: ["deduction", "arrangement"],
      },
      {
        categoryId: logicalId,
        subTopicId: verbId,
        type: "verbal_analogy",
        difficulty: "medium",
        questionText: "TREE : FOREST :: STAR : ?",
        options: ["SKY", "GALAXY", "NIGHT", "PLANET"],
        correctAnswer: 1,
        explanation: "A tree is part of a forest; a star is part of a galaxy. The relationship is part-to-whole.",
        timeLimitSeconds: 45,
        tags: ["analogy", "part-whole"],
      },
      {
        categoryId: logicalId,
        subTopicId: verbId,
        type: "verbal_analogy",
        difficulty: "hard",
        questionText: "AUTHOR : BOOK :: COMPOSER : ?",
        options: ["SONG", "SYMPHONY", "PIANO", "NOTES"],
        correctAnswer: 1,
        explanation: "An author creates a book; a composer creates a symphony. Both are creators of their respective large-scale works.",
        timeLimitSeconds: 45,
        tags: ["analogy", "creator-product"],
      },
      {
        categoryId: abstractId,
        subTopicId: shapeId,
        type: "abstract_pattern",
        difficulty: "easy",
        questionText: "In a sequence of shapes, a circle grows larger each step. If the pattern starts with radius 1, then 2, then 3, what is the radius of the 5th shape?",
        options: ["4", "5", "6", "8"],
        correctAnswer: 1,
        explanation: "The radius increases by 1 each time: 1, 2, 3, 4, 5. The 5th shape has radius 5.",
        timeLimitSeconds: 30,
        tags: ["pattern", "size"],
      },
      {
        categoryId: abstractId,
        subTopicId: shapeId,
        type: "abstract_pattern",
        difficulty: "medium",
        questionText: "A shape rotates 45° clockwise each step. If it starts pointing up (0°), what direction does it point after 5 steps?",
        options: ["Right (90°)", "Down (180°)", "Diagonal (225°)", "Left (270°)"],
        correctAnswer: 2,
        explanation: "5 x 45° = 225° from starting position. 225° points diagonally down-left.",
        timeLimitSeconds: 45,
        tags: ["pattern", "rotation"],
      },
      {
        categoryId: abstractId,
        subTopicId: matId,
        type: "abstract_pattern",
        difficulty: "medium",
        questionText: "In a 3x3 grid, each row contains one circle, one square, and one triangle. Row 1: Circle, Square, Triangle. Row 2: Square, Triangle, Circle. What completes Row 3?",
        options: [
          "Circle, Triangle, Square",
          "Triangle, Circle, Square",
          "Triangle, Square, Circle",
          "Square, Circle, Triangle",
        ],
        correctAnswer: 1,
        explanation: "Each row is a cyclic shift of the previous: Circle-Square-Triangle → Square-Triangle-Circle → Triangle-Circle-Square.",
        timeLimitSeconds: 60,
        tags: ["matrix", "permutation"],
      },
      {
        categoryId: abstractId,
        subTopicId: matId,
        type: "abstract_analogy",
        difficulty: "hard",
        questionText: "In a 3x3 matrix, each cell contains shapes. Going right: add one side. Going down: add one dot. If the center has a triangle with 1 dot, what is the bottom-right?",
        options: [
          "Pentagon with 2 dots",
          "Square with 2 dots",
          "Pentagon with 1 dot",
          "Hexagon with 2 dots",
        ],
        correctAnswer: 0,
        explanation: "From center to bottom-right: going right adds one side (triangle 3→square 4→pentagon 5), going down adds one dot (1→2). Bottom-right = Pentagon with 2 dots.",
        timeLimitSeconds: 120,
        tags: ["matrix", "combined-rules"],
      },
      {
        categoryId: abstractId,
        subTopicId: spatId,
        type: "spatial_reasoning",
        difficulty: "hard",
        questionText: "A cube has different symbols on each face. If the top shows a star, front shows a circle, and right shows a triangle, what is on the bottom?",
        options: ["Star", "Circle", "Triangle", "Cannot be determined"],
        correctAnswer: 3,
        explanation: "On a standard die/cube, opposite faces always sum to 7. But this is a cube with symbols, not numbers. Without knowing which symbols are opposite each other, we cannot determine what is on the bottom face.",
        timeLimitSeconds: 90,
        tags: ["spatial", "3d-reasoning"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "hard",
        questionText: "Find the next term: 1, 2, 6, 24, 120, ?",
        options: ["240", "360", "620", "720"],
        correctAnswer: 3,
        explanation: "Factorial sequence: 1! = 1, 2! = 2, 3! = 6, 4! = 24, 5! = 120, so 6! = 720.",
        timeLimitSeconds: 60,
        tags: ["factorial"],
      },
      {
        categoryId: numericalId,
        subTopicId: dataId,
        type: "data_interpretation",
        difficulty: "medium",
        questionText: "A bar chart shows sales: Jan=£40k, Feb=£55k, Mar=£45k, Apr=£60k. What is the percentage increase from Jan to Apr?",
        options: ["40%", "50%", "60%", "75%"],
        correctAnswer: 1,
        explanation: "Increase = £60k - £40k = £20k. Percentage increase = (20/40) x 100 = 50%.",
        timeLimitSeconds: 60,
        tags: ["data", "percentage"],
      },
      {
        categoryId: numericalId,
        subTopicId: numSeqId,
        type: "numerical_sequence",
        difficulty: "hard",
        questionText: "What comes next: 0, 1, 3, 7, 15, 31, ?",
        options: ["47", "55", "63", "64"],
        correctAnswer: 2,
        explanation: "Each term is 2x(previous) + 1: 0x2+1=1, 1x2+1=3, 3x2+1=7, 7x2+1=15, 15x2+1=31, so 31x2+1=63.",
        timeLimitSeconds: 90,
        tags: ["recursive", "doubling"],
      },
      {
        categoryId: logicalId,
        subTopicId: logId,
        type: "logical_deduction",
        difficulty: "hard",
        questionText: "Four students (P, Q, R, S) each study one unique subject: Math, Physics, Chemistry, Biology. Q studies Biology. R studies Physics. P doesn't study Math. What does S study?",
        options: ["Math", "Physics", "Chemistry", "Biology"],
        correctAnswer: 0,
        explanation: "Q studies Biology, R studies Physics. P doesn't study Math, so P must study Chemistry. By elimination, S studies Math.",
        timeLimitSeconds: 75,
        tags: ["deduction", "elimination"],
      },
      {
        categoryId: logicalId,
        subTopicId: sylId,
        type: "syllogism",
        difficulty: "hard",
        questionText: "Some managers are leaders. All leaders are decisive. No decisive people are indecisive. Therefore:?",
        options: [
          "Some managers are indecisive",
          "Some managers are decisive",
          "All managers are decisive",
          "No managers are leaders",
        ],
        correctAnswer: 1,
        explanation: "Some managers are leaders, and all leaders are decisive. Therefore, at least those managers who are leaders must be decisive. 'Some managers are decisive' follows necessarily.",
        timeLimitSeconds: 90,
        tags: ["syllogism", "chain-reasoning"],
      },
      {
        categoryId: abstractId,
        subTopicId: shapeId,
        type: "abstract_pattern",
        difficulty: "hard",
        questionText: "A sequence shows: triangle(1 line inside), square(2 lines), pentagon(3 lines). What shape has 5 lines inside?",
        options: ["Hexagon", "Heptagon", "Octagon", "Nonagon"],
        correctAnswer: 1,
        explanation: "Pattern: sides increase by 1 each time (3, 4, 5...), and internal lines increase by 1 (1, 2, 3...). For 5 internal lines: shape has 3+5-1 = 7 sides = Heptagon.",
        timeLimitSeconds: 90,
        tags: ["pattern", "combined"],
      },
    ]);

    return {
      message: "Seed completed successfully",
      categories: 3,
      subTopics: 12,
      questions: 25,
    };
  }),
});
