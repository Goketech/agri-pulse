import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  region: z.enum(["NG", "RW"]),
  role: z.enum(["agripreneur", "mentor", "admin"]),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// In-memory store for initial prototype; replace with Prisma in production
const users: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  region: "NG" | "RW";
  role: "agripreneur" | "mentor" | "admin";
}[] = [];

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

router.post("/register", async (req, res) => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { name, email, password, region, role } = parseResult.data;

  const existing = users.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "User already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = {
    id: `${Date.now()}`,
    name,
    email,
    passwordHash,
    region,
    role,
  };
  users.push(newUser);

  return res.status(201).json({ id: newUser.id, name, email, region, role });
});

router.post("/login", async (req, res) => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.flatten() });
  }

  const { email, password } = parseResult.data;
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, region: user.region },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  return res.json({ token });
});

export default router;

