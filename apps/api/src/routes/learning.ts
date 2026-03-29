import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { calculateLessonProgress, gradeQuizAttempt } from "../lib/lms";

const router = Router();

const moduleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  cropValueChain: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  badgeName: z.string().optional(),
});

const lessonSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(3),
  body: z.string().min(20),
  estimatedMinutes: z.number().int().positive().optional(),
});

const quizSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
});

const questionSchema = z.object({
  order: z.number().int().positive(),
  prompt: z.string().min(5),
  options: z.array(z.string().min(1)).min(2),
  correctIndex: z.number().int().min(0),
  explanation: z.string().optional(),
});

const attemptSchema = z.object({
  answers: z.array(z.number().int()).min(1),
});

const lessonProgressSchema = z.object({
  currentLesson: z.number().int().min(0),
  timeSpentMinutes: z.number().int().min(0).optional(),
});

async function awardBadgeIfNeeded(args: {
  agripreneurId: string;
  userId: string;
  moduleId: string;
  moduleTitle: string;
  badgeName: string | null;
}) {
  const existingBadge = await prisma.badge.findFirst({
    where: { agripreneurId: args.agripreneurId, moduleId: args.moduleId },
    select: { id: true },
  });
  if (existingBadge) return;

  const resolvedBadgeName = args.badgeName || `${args.moduleTitle} Graduate`;
  await prisma.badge.create({
    data: {
      agripreneurId: args.agripreneurId,
      moduleId: args.moduleId,
      name: resolvedBadgeName,
      description: `Completed "${args.moduleTitle}" module`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: args.userId,
      type: "badge_earned",
      content: `Congratulations! You earned the "${resolvedBadgeName}" badge!`,
      channel: "push",
    },
  });
}

router.get("/modules", requireAuth, async (req, res) => {
  const { cropValueChain, difficulty } = req.query;

  const where: Record<string, unknown> = {};
  if (cropValueChain) where.cropValueChain = { contains: cropValueChain as string, mode: "insensitive" };
  if (difficulty) where.difficultyLevel = difficulty;

  const modules = await prisma.learningModule.findMany({
    where,
    include: {
      _count: { select: { enrollments: true, lessons: true } },
      quiz: { select: { id: true, passingScore: true, _count: { select: { questions: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      content: m.content,
      cropValueChain: m.cropValueChain,
      durationMinutes: m.durationMinutes,
      difficultyLevel: m.difficultyLevel,
      badgeName: m.badgeName,
      enrollmentCount: m._count.enrollments,
      lessonCount: m._count.lessons,
      quizId: m.quiz?.id ?? null,
      questionCount: m.quiz?._count.questions ?? 0,
      passingScore: m.quiz?.passingScore ?? null,
      createdAt: m.createdAt,
    })),
  });
});

router.get("/modules/:id", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  const mod = await prisma.learningModule.findUnique({
    where: { id: req.params.id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      quiz: {
        include: {
          _count: { select: { questions: true } },
          questions: { select: { id: true, order: true, prompt: true, type: true }, orderBy: { order: "asc" } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const enrollment = agripreneur
    ? await prisma.learningEnrollment.findUnique({
        where: { agripreneurId_moduleId: { agripreneurId: agripreneur.id, moduleId: mod.id } },
      })
    : null;

  const attempts =
    agripreneur && mod.quiz
      ? await prisma.quizAttempt.findMany({
          where: { agripreneurId: agripreneur.id, quizId: mod.quiz.id },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : [];

  return res.json({
    id: mod.id,
    title: mod.title,
    content: mod.content,
    cropValueChain: mod.cropValueChain,
    durationMinutes: mod.durationMinutes,
    difficultyLevel: mod.difficultyLevel,
    badgeName: mod.badgeName,
    enrollmentCount: mod._count.enrollments,
    lessons: mod.lessons,
    quiz: mod.quiz
      ? {
          id: mod.quiz.id,
          title: mod.quiz.title,
          description: mod.quiz.description,
          passingScore: mod.quiz.passingScore,
          questionCount: mod.quiz._count.questions,
          questions: mod.quiz.questions,
        }
      : null,
    enrollment,
    recentAttempts: attempts.map((a) => ({
      id: a.id,
      score: a.score,
      passed: a.passed,
      createdAt: a.createdAt,
    })),
  });
});

router.post("/modules", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = moduleSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const mod = await prisma.learningModule.create({ data: parseResult.data });
  return res.status(201).json(mod);
});

router.post("/modules/:id/lessons", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = lessonSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const mod = await prisma.learningModule.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const lesson = await prisma.lesson.create({
    data: {
      moduleId: req.params.id,
      order: parseResult.data.order,
      title: parseResult.data.title,
      body: parseResult.data.body,
      estimatedMinutes: parseResult.data.estimatedMinutes ?? 10,
    },
  });

  await prisma.learningEnrollment.updateMany({
    where: { moduleId: req.params.id },
    data: { totalLessons: await prisma.lesson.count({ where: { moduleId: req.params.id } }) },
  });

  return res.status(201).json(lesson);
});

router.put("/lessons/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = lessonSchema.partial().safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const existing = await prisma.lesson.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Lesson not found" });

  const lesson = await prisma.lesson.update({
    where: { id: req.params.id },
    data: {
      order: parseResult.data.order,
      title: parseResult.data.title,
      body: parseResult.data.body,
      estimatedMinutes: parseResult.data.estimatedMinutes,
    },
  });

  return res.json(lesson);
});

router.post("/modules/:id/quiz", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = quizSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const mod = await prisma.learningModule.findUnique({ where: { id: req.params.id }, select: { id: true } });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const quiz = await prisma.quiz.upsert({
    where: { moduleId: req.params.id },
    update: {
      title: parseResult.data.title,
      description: parseResult.data.description,
      passingScore: parseResult.data.passingScore ?? 70,
    },
    create: {
      moduleId: req.params.id,
      title: parseResult.data.title,
      description: parseResult.data.description,
      passingScore: parseResult.data.passingScore ?? 70,
    },
  });

  return res.status(201).json(quiz);
});

router.post("/quizzes/:id/questions", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = questionSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });
  if (parseResult.data.correctIndex >= parseResult.data.options.length) {
    return res.status(400).json({ error: "correctIndex is out of range" });
  }

  const quiz = await prisma.quiz.findUnique({ where: { id: req.params.id } });
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const question = await prisma.quizQuestion.create({
    data: {
      quizId: quiz.id,
      order: parseResult.data.order,
      prompt: parseResult.data.prompt,
      type: "single_choice",
      optionsJson: JSON.stringify(parseResult.data.options),
      correctIndex: parseResult.data.correctIndex,
      explanation: parseResult.data.explanation,
    },
  });

  return res.status(201).json(question);
});

router.get("/quizzes/:id", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can access quizzes" });

  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      module: { select: { id: true, title: true } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });

  const enrollment = await prisma.learningEnrollment.findUnique({
    where: { agripreneurId_moduleId: { agripreneurId: agripreneur.id, moduleId: quiz.moduleId } },
  });
  if (!enrollment) return res.status(403).json({ error: "Enroll in this module to access the quiz" });

  return res.json({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    passingScore: quiz.passingScore,
    module: quiz.module,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      order: q.order,
      prompt: q.prompt,
      type: q.type,
      options: JSON.parse(q.optionsJson) as string[],
    })),
  });
});

router.post("/quizzes/:id/attempt", requireAuth, async (req, res) => {
  const parseResult = attemptSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can submit quiz attempts" });

  const quiz = await prisma.quiz.findUnique({
    where: { id: req.params.id },
    include: {
      module: { select: { id: true, title: true, badgeName: true } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  if (quiz.questions.length === 0) return res.status(400).json({ error: "Quiz has no questions" });

  const enrollment = await prisma.learningEnrollment.findUnique({
    where: { agripreneurId_moduleId: { agripreneurId: agripreneur.id, moduleId: quiz.moduleId } },
  });
  if (!enrollment) return res.status(403).json({ error: "Enroll in this module to submit quiz attempts" });

  if (parseResult.data.answers.length !== quiz.questions.length) {
    return res.status(400).json({ error: "Answers count must match number of questions" });
  }

  const grading = gradeQuizAttempt(
    quiz.questions.map((q) => q.correctIndex),
    parseResult.data.answers,
    quiz.passingScore,
  );

  const questionResults = quiz.questions.map((q, idx) => {
    const selected = parseResult.data.answers[idx];
    const correct = selected === q.correctIndex;
    return {
      questionId: q.id,
      selectedIndex: selected,
      correctIndex: q.correctIndex,
      correct,
      explanation: q.explanation,
    };
  });

  const attempt = await prisma.quizAttempt.create({
    data: {
      agripreneurId: agripreneur.id,
      quizId: quiz.id,
      score: grading.score,
      passed: grading.passed,
      answersJson: JSON.stringify(parseResult.data.answers),
    },
  });

  let updatedEnrollment = enrollment;
  if (grading.passed && !enrollment.completed) {
    updatedEnrollment = await prisma.learningEnrollment.update({
      where: { id: enrollment.id },
      data: {
        progressPercent: 100,
        completed: true,
        completedAt: new Date(),
      },
    });
    await awardBadgeIfNeeded({
      agripreneurId: agripreneur.id,
      userId: req.user!.sub,
      moduleId: quiz.module.id,
      moduleTitle: quiz.module.title,
      badgeName: quiz.module.badgeName,
    });
  }

  return res.json({
    attempt: { id: attempt.id, score: grading.score, passed: grading.passed, createdAt: attempt.createdAt },
    result: {
      totalQuestions: quiz.questions.length,
      correctCount: grading.correctCount,
      score: grading.score,
      passed: grading.passed,
      passingScore: quiz.passingScore,
      questionResults,
    },
    enrollment: updatedEnrollment,
  });
});

router.post("/enroll/:moduleId", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can enroll" });

  const mod = await prisma.learningModule.findUnique({ where: { id: req.params.moduleId } });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  const existing = await prisma.learningEnrollment.findUnique({
    where: { agripreneurId_moduleId: { agripreneurId: agripreneur.id, moduleId: mod.id } },
  });
  if (existing) return res.status(409).json({ error: "Already enrolled", enrollment: existing });

  const totalLessons = await prisma.lesson.count({ where: { moduleId: mod.id } });
  const enrollment = await prisma.learningEnrollment.create({
    data: {
      agripreneurId: agripreneur.id,
      moduleId: mod.id,
      totalLessons,
      currentLesson: totalLessons > 0 ? 1 : 0,
      lastViewedAt: new Date(),
    },
  });

  return res.status(201).json(enrollment);
});

router.patch("/enrollments/:enrollmentId/lesson", requireAuth, async (req, res) => {
  const parseResult = lessonProgressSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });
  const enrollment = await prisma.learningEnrollment.findUnique({
    where: { id: req.params.enrollmentId },
    include: { agripreneur: true, module: true },
  });
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
  if (enrollment.agripreneur.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Not your enrollment" });
  }

  const lessonCount = await prisma.lesson.count({ where: { moduleId: enrollment.moduleId } });
  const currentLesson = Math.min(parseResult.data.currentLesson, lessonCount);
  const lessonProgress = calculateLessonProgress(currentLesson, lessonCount);
  const progressPercent = Math.max(enrollment.progressPercent, lessonProgress);

  const updated = await prisma.learningEnrollment.update({
    where: { id: enrollment.id },
    data: {
      currentLesson,
      totalLessons: lessonCount,
      progressPercent,
      lastViewedAt: new Date(),
      timeSpentMinutes: enrollment.timeSpentMinutes + (parseResult.data.timeSpentMinutes ?? 0),
      completed: enrollment.completed,
      completedAt: enrollment.completedAt,
    },
  });

  return res.json(updated);
});

// Backward-compat endpoint (legacy clients)
router.patch("/progress/:enrollmentId", requireAuth, async (req, res) => {
  const { progressPercent } = req.body;
  if (typeof progressPercent !== "number" || progressPercent < 0 || progressPercent > 100) {
    return res.status(400).json({ error: "progressPercent must be 0-100" });
  }

  const enrollment = await prisma.learningEnrollment.findUnique({
    where: { id: req.params.enrollmentId },
    include: { agripreneur: true, module: true },
  });
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
  if (enrollment.agripreneur.userId !== req.user!.sub) return res.status(403).json({ error: "Not your enrollment" });

  const completed = progressPercent >= 100;
  const updated = await prisma.learningEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent: Math.min(progressPercent, 100),
      completed,
      completedAt: completed && !enrollment.completed ? new Date() : enrollment.completedAt,
      lastViewedAt: new Date(),
    },
  });

  if (completed && !enrollment.completed) {
    await awardBadgeIfNeeded({
      agripreneurId: enrollment.agripreneurId,
      userId: req.user!.sub,
      moduleId: enrollment.moduleId,
      moduleTitle: enrollment.module.title,
      badgeName: enrollment.module.badgeName,
    });
  }

  return res.json(updated);
});

router.get("/enrollments", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.json({ enrollments: [] });

  const enrollments = await prisma.learningEnrollment.findMany({
    where: { agripreneurId: agripreneur.id },
    include: { module: { select: { title: true, cropValueChain: true, difficultyLevel: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    enrollments: enrollments.map((e) => ({
      id: e.id,
      moduleId: e.moduleId,
      moduleTitle: e.module.title,
      cropValueChain: e.module.cropValueChain,
      difficultyLevel: e.module.difficultyLevel,
      progressPercent: e.progressPercent,
      currentLesson: e.currentLesson,
      totalLessons: e.totalLessons,
      lastViewedAt: e.lastViewedAt,
      timeSpentMinutes: e.timeSpentMinutes,
      completed: e.completed,
      completedAt: e.completedAt,
    })),
  });
});

router.get("/badges", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.json({ badges: [] });

  const badges = await prisma.badge.findMany({
    where: { agripreneurId: agripreneur.id },
    orderBy: { awardedAt: "desc" },
  });

  return res.json({ badges });
});

export default router;
