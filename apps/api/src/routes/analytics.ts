import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const analyticsSchema = z.object({
  cropType: z.string().min(1),
  soilHealthIndex: z.number().min(0).max(100).optional(),
  historicalYield: z.number().min(0).optional(),
  currentMarketPrice: z.number().min(0).optional(),
  region: z.enum(["NG", "RW"]).optional(),
  alertThreshold: z.number().optional(),
});

router.get("/", requireAuth, async (req, res) => {
  const { cropType, region } = req.query;

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });

  const where: Record<string, unknown> = {};
  if (agripreneur) where.agripreneurId = agripreneur.id;
  if (cropType) where.cropType = cropType;
  if (region) where.region = region;

  const analytics = await prisma.cropAnalytics.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const grouped: Record<string, typeof analytics> = {};
  for (const a of analytics) {
    if (!grouped[a.cropType]) grouped[a.cropType] = [];
    grouped[a.cropType].push(a);
  }

  return res.json({ analytics, grouped });
});

router.post("/", requireAuth, async (req, res) => {
  const parseResult = analyticsSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can create analytics" });

  const entry = await prisma.cropAnalytics.create({
    data: {
      ...parseResult.data,
      region: parseResult.data.region || req.user!.region,
      agripreneurId: agripreneur.id,
    },
  });

  if (parseResult.data.alertThreshold && parseResult.data.currentMarketPrice) {
    const previous = await prisma.cropAnalytics.findFirst({
      where: {
        agripreneurId: agripreneur.id,
        cropType: parseResult.data.cropType,
        id: { not: entry.id },
      },
      orderBy: { createdAt: "desc" },
    });

    if (previous?.currentMarketPrice) {
      const changePercent =
        ((parseResult.data.currentMarketPrice - previous.currentMarketPrice) / previous.currentMarketPrice) * 100;

      if (Math.abs(changePercent) >= parseResult.data.alertThreshold) {
        const direction = changePercent > 0 ? "increased" : "decreased";
        await prisma.notification.create({
          data: {
            userId: req.user!.sub,
            type: "price_alert",
            content: `${parseResult.data.cropType} price ${direction} by ${Math.abs(changePercent).toFixed(1)}% to ${parseResult.data.currentMarketPrice}`,
            channel: "push",
            analyticsId: entry.id,
          },
        });
      }
    }
  }

  return res.status(201).json(entry);
});

router.get("/alerts", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.json({ alerts: [] });

  const crops = await prisma.cropAnalytics.findMany({
    where: { agripreneurId: agripreneur.id },
    orderBy: { createdAt: "desc" },
  });

  const alerts: {
    id: string;
    cropType: string;
    region: string;
    currentPrice: number;
    previousPrice: number;
    changePercent: number;
  }[] = [];
  const seen = new Set<string>();

  for (const c of crops) {
    if (seen.has(c.cropType) || !c.currentMarketPrice) continue;

    const previous = crops.find(
      (p) => p.cropType === c.cropType && p.id !== c.id && p.currentMarketPrice != null
    );

    if (previous?.currentMarketPrice) {
      const changePercent =
        ((c.currentMarketPrice - previous.currentMarketPrice) / previous.currentMarketPrice) * 100;

      if (Math.abs(changePercent) >= 5) {
        alerts.push({
          id: c.id,
          cropType: c.cropType,
          region: c.region,
          currentPrice: c.currentMarketPrice,
          previousPrice: previous.currentMarketPrice,
          changePercent: Math.round(changePercent * 10) / 10,
        });
      }
    }
    seen.add(c.cropType);
  }

  return res.json({ alerts });
});

router.get("/summary", requireAuth, async (req, res) => {
  const region = (req.query.region as string) || req.user!.region;

  const recentAnalytics = await prisma.cropAnalytics.findMany({
    where: { region },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const cropSummaries: Record<
    string,
    { avgSoilHealth: number; avgYield: number; latestPrice: number; entries: number }
  > = {};

  for (const a of recentAnalytics) {
    if (!cropSummaries[a.cropType]) {
      cropSummaries[a.cropType] = { avgSoilHealth: 0, avgYield: 0, latestPrice: 0, entries: 0 };
    }
    const s = cropSummaries[a.cropType];
    s.entries++;
    if (a.soilHealthIndex) s.avgSoilHealth += a.soilHealthIndex;
    if (a.historicalYield) s.avgYield += a.historicalYield;
    if (a.currentMarketPrice && !s.latestPrice) s.latestPrice = a.currentMarketPrice;
  }

  const summaries = Object.entries(cropSummaries).map(([crop, s]) => ({
    cropType: crop,
    avgSoilHealth: s.entries ? Math.round((s.avgSoilHealth / s.entries) * 10) / 10 : 0,
    avgYield: s.entries ? Math.round((s.avgYield / s.entries) * 10) / 10 : 0,
    latestPrice: s.latestPrice,
    entries: s.entries,
  }));

  return res.json({ region, summaries });
});

export default router;
