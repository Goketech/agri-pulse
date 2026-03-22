import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as OTPAuth from "otpauth";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  region: z.enum(["NG", "RW"]),
  role: z.enum(["agripreneur", "mentor", "admin"]),
  cropInterest: z.string().optional(),
  expertise: z.string().optional(),
  cropValueChain: z.string().optional(),
  yearsOfExperience: z.number().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

function signJwt(user: { id: string; name: string; email: string; role: string; region: string }) {
  return jwt.sign(
    { sub: user.id, name: user.name, email: user.email, role: user.role, region: user.region },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
}

router.post("/register", async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { name, email, password, region, role, cropInterest, expertise, cropValueChain, yearsOfExperience } =
    parseResult.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      region,
      role,
      ...(role === "agripreneur" && {
        agripreneur: { create: { cropInterest } },
      }),
      ...(role === "mentor" && {
        mentor: { create: { expertise, cropValueChain, yearsOfExperience } },
      }),
      ...(role === "admin" && {
        administrator: { create: {} },
      }),
    },
  });

  return res.status(201).json({ id: user.id, name, email, region, role });
});

router.post("/login", async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email, password } = parseResult.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.mfaEnabled && user.mfaSecret) {
    const mfaToken = jwt.sign({ sub: user.id, mfaPending: true }, JWT_SECRET, { expiresIn: "5m" });
    return res.json({ mfaRequired: true, mfaToken });
  }

  const token = signJwt(user);
  return res.json({ token, user: { id: user.id, name: user.name, email: user.email, region: user.region, role: user.role } });
});

router.post("/mfa/setup", requireAuth, async (req, res) => {
  try {
    const secret = new OTPAuth.Secret();
    const totpInstance = new OTPAuth.TOTP({
      issuer: "AgriPulse Hub",
      label: req.user!.email,
      secret,
    });

    await prisma.user.update({
      where: { id: req.user!.sub },
      data: { mfaSecret: secret.base32 },
    });

    return res.json({ secret: secret.base32, otpauthUrl: totpInstance.toString() });
  } catch {
    return res.status(500).json({ error: "Failed to set up MFA" });
  }
});

router.post("/mfa/enable", requireAuth, async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "TOTP code is required" });

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user?.mfaSecret) return res.status(400).json({ error: "MFA not set up" });

  try {
    const totpInstance = new OTPAuth.TOTP({
      issuer: "AgriPulse Hub",
      label: user.email,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });
    const delta = totpInstance.validate({ token: code });
    if (delta === null) return res.status(400).json({ error: "Invalid TOTP code" });

    await prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: true },
    });

    return res.json({ success: true, message: "MFA enabled" });
  } catch {
    return res.status(500).json({ error: "MFA verification failed" });
  }
});

router.post("/mfa/validate", async (req, res) => {
  const { mfaToken, code } = req.body;
  if (!mfaToken || !code) return res.status(400).json({ error: "mfaToken and code are required" });

  try {
    const payload = jwt.verify(mfaToken, JWT_SECRET) as { sub: string; mfaPending: boolean };
    if (!payload.mfaPending) return res.status(400).json({ error: "Invalid MFA token" });

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mfaSecret) return res.status(400).json({ error: "MFA not configured" });

    const totpInstance = new OTPAuth.TOTP({
      issuer: "AgriPulse Hub",
      label: user.email,
      secret: OTPAuth.Secret.fromBase32(user.mfaSecret),
    });
    const delta = totpInstance.validate({ token: code });
    if (delta === null) return res.status(401).json({ error: "Invalid TOTP code" });

    const token = signJwt(user);
    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, region: user.region, role: user.role } });
  } catch {
    return res.status(401).json({ error: "Invalid or expired MFA token" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
    select: { id: true, name: true, email: true, region: true, role: true, mfaEnabled: true },
  });
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
});

export default router;
