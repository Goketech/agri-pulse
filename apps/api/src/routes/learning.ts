import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const moduleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  cropValueChain: z.string().min(1),
  durationMinutes: z.number().int().positive(),
  difficultyLevel: z.enum(["beginner", "intermediate", "advanced"]),
  badgeName: z.string().optional(),
});

router.get("/modules", requireAuth, async (req, res) => {
  const { cropValueChain, difficulty } = req.query;

  const where: Record<string, unknown> = {};
  if (cropValueChain) where.cropValueChain = { contains: cropValueChain as string, mode: "insensitive" };
  if (difficulty) where.difficultyLevel = difficulty;

  const modules = await prisma.learningModule.findMany({
    where,
    include: { _count: { select: { enrollments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    modules: modules.map((m) => ({
      id: m.id,
      title: m.title,
      cropValueChain: m.cropValueChain,
      durationMinutes: m.durationMinutes,
      difficultyLevel: m.difficultyLevel,
      badgeName: m.badgeName,
      enrollmentCount: m._count.enrollments,
      createdAt: m.createdAt,
    })),
  });
});

router.get("/modules/:id", requireAuth, async (req, res) => {
  const mod = await prisma.learningModule.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { enrollments: true } } },
  });
  if (!mod) return res.status(404).json({ error: "Module not found" });

  return res.json({ ...mod, enrollmentCount: mod._count.enrollments });
});

router.post("/modules", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = moduleSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const mod = await prisma.learningModule.create({ data: parseResult.data });
  return res.status(201).json(mod);
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

  const enrollment = await prisma.learningEnrollment.create({
    data: { agripreneurId: agripreneur.id, moduleId: mod.id },
  });

  return res.status(201).json(enrollment);
});

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
  if (enrollment.agripreneur.userId !== req.user!.sub) {
    return res.status(403).json({ error: "Not your enrollment" });
  }

  const completed = progressPercent >= 100;
  const updated = await prisma.learningEnrollment.update({
    where: { id: enrollment.id },
    data: {
      progressPercent: Math.min(progressPercent, 100),
      completed,
      completedAt: completed && !enrollment.completed ? new Date() : enrollment.completedAt,
    },
  });

  if (completed && !enrollment.completed) {
    const badgeName = enrollment.module.badgeName || `${enrollment.module.title} Graduate`;
    await prisma.badge.create({
      data: {
        agripreneurId: enrollment.agripreneurId,
        name: badgeName,
        description: `Completed "${enrollment.module.title}" module`,
        moduleId: enrollment.moduleId,
      },
    });

    await prisma.notification.create({
      data: {
        userId: req.user!.sub,
        type: "badge_earned",
        content: `Congratulations! You earned the "${badgeName}" badge!`,
        channel: "push",
      },
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
