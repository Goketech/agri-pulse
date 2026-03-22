import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const listingSchema = z.object({
  equipmentName: z.string().min(1),
  description: z.string().optional(),
  condition: z.enum(["new", "good", "fair", "poor"]),
  price: z.number().positive(),
  transactionType: z.enum(["rent", "sale"]),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  region: z.enum(["NG", "RW"]).optional(),
});

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

router.get("/listings", requireAuth, async (req, res) => {
  const { lat, lng, maxDistance, type, region, search } = req.query;

  const where: Record<string, unknown> = { status: "active" };
  if (type) where.transactionType = type;
  if (region) where.region = region;
  if (search) where.equipmentName = { contains: search as string, mode: "insensitive" };

  const listings = await prisma.marketplaceListing.findMany({
    where,
    include: {
      owner: { include: { user: { select: { name: true, region: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  let results = listings.map((l) => ({
    id: l.id,
    equipmentName: l.equipmentName,
    description: l.description,
    condition: l.condition,
    price: l.price,
    transactionType: l.transactionType,
    latitude: l.latitude,
    longitude: l.longitude,
    region: l.region,
    isVerified: l.isVerified,
    status: l.status,
    ownerName: l.owner.user.name,
    ownerId: l.ownerId,
    createdAt: l.createdAt.toISOString(),
    distance: undefined as number | undefined,
  }));

  if (lat && lng) {
    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const maxDist = maxDistance ? parseFloat(maxDistance as string) : 100;

    results = results
      .map((r) => ({
        ...r,
        distance: r.latitude && r.longitude ? haversineDistance(userLat, userLng, r.latitude, r.longitude) : undefined,
      }))
      .filter((r) => r.distance === undefined || r.distance <= maxDist)
      .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }

  return res.json({ listings: results });
});

router.post("/listings", requireAuth, async (req, res) => {
  const parseResult = listingSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can create listings" });

  const listing = await prisma.marketplaceListing.create({
    data: {
      ...parseResult.data,
      description: parseResult.data.description || "",
      region: parseResult.data.region || req.user!.region,
      ownerId: agripreneur.id,
    },
  });

  return res.status(201).json(listing);
});

router.put("/listings/:id", requireAuth, async (req, res) => {
  const existing = await prisma.marketplaceListing.findUnique({
    where: { id: req.params.id },
    include: { owner: true },
  });
  if (!existing) return res.status(404).json({ error: "Listing not found" });
  if (existing.owner.userId !== req.user!.sub) return res.status(403).json({ error: "Not your listing" });

  const parseResult = listingSchema.partial().safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const updated = await prisma.marketplaceListing.update({
    where: { id: req.params.id },
    data: parseResult.data,
  });

  return res.json(updated);
});

router.delete("/listings/:id", requireAuth, async (req, res) => {
  const existing = await prisma.marketplaceListing.findUnique({
    where: { id: req.params.id },
    include: { owner: true },
  });
  if (!existing) return res.status(404).json({ error: "Listing not found" });
  if (existing.owner.userId !== req.user!.sub && req.user!.role !== "admin") {
    return res.status(403).json({ error: "Not authorized" });
  }

  await prisma.marketplaceListing.update({
    where: { id: req.params.id },
    data: { status: "deleted" },
  });

  return res.json({ success: true });
});

router.patch("/listings/:id/verify", requireAuth, requireRole("admin"), async (req, res) => {
  const listing = await prisma.marketplaceListing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: "Listing not found" });

  const updated = await prisma.marketplaceListing.update({
    where: { id: req.params.id },
    data: { isVerified: true },
  });

  return res.json(updated);
});

router.post("/listings/:id/pay", requireAuth, async (req, res) => {
  const listing = await prisma.marketplaceListing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: "Listing not found" });
  if (listing.status !== "active") return res.status(400).json({ error: "Listing is not active" });

  const existingPayment = await prisma.payment.findUnique({ where: { listingId: listing.id } });
  if (existingPayment) return res.status(400).json({ error: "Payment already initiated" });

  const reference = `AP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const currency = listing.region === "RW" ? "RWF" : "NGN";

  if (process.env.PAYSTACK_SECRET_KEY) {
    try {
      const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: req.user!.email,
          amount: Math.round(listing.price * 100),
          reference,
          currency,
          callback_url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/marketplace?payment=success`,
        }),
      });

      const paystackData = await paystackRes.json();

      const payment = await prisma.payment.create({
        data: {
          listingId: listing.id,
          payerId: req.user!.sub,
          amount: listing.price,
          currency,
          gateway: "paystack",
          reference,
          status: "pending",
          gatewayRef: paystackData.data?.reference,
        },
      });

      return res.json({ payment, authorizationUrl: paystackData.data?.authorization_url });
    } catch {
      return res.status(500).json({ error: "Payment initiation failed" });
    }
  }

  const payment = await prisma.payment.create({
    data: {
      listingId: listing.id,
      payerId: req.user!.sub,
      amount: listing.price,
      currency,
      gateway: "mock",
      reference,
      status: "pending",
    },
  });

  return res.json({ payment, message: "Payment gateway not configured. Mock payment created." });
});

router.post("/webhooks/payment", async (req, res) => {
  const { event, data } = req.body;

  if (event === "charge.success" && data?.reference) {
    const payment = await prisma.payment.findUnique({ where: { reference: data.reference } });
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "completed", gatewayRef: data.gateway_response },
      });

      await prisma.marketplaceListing.update({
        where: { id: payment.listingId },
        data: { status: "sold" },
      });
    }
  }

  return res.json({ received: true });
});

export default router;
