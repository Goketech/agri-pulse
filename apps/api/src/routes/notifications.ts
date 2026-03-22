import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const sendSchema = z.object({
  userId: z.string().min(1),
  type: z.string().min(1),
  content: z.string().min(1),
  channel: z.enum(["sms", "push"]),
  phone: z.string().optional(),
});

async function sendSms(phone: string, message: string): Promise<{ success: boolean; messageId?: string }> {
  if (process.env.AT_API_KEY && process.env.AT_USERNAME) {
    try {
      const response = await fetch("https://api.africastalking.com/version1/messaging", {
        method: "POST",
        headers: {
          apiKey: process.env.AT_API_KEY,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          username: process.env.AT_USERNAME,
          to: phone,
          message,
        }),
      });

      const data = await response.json();
      return { success: response.ok, messageId: data?.SMSMessageData?.Recipients?.[0]?.messageId };
    } catch {
      return { success: false };
    }
  }

  return { success: true, messageId: `mock-${Date.now()}` };
}

router.get("/", requireAuth, async (req, res) => {
  const { unreadOnly } = req.query;

  const where: Record<string, unknown> = { userId: req.user!.sub };
  if (unreadOnly === "true") where.read = false;

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  return res.json({ notifications });
});

router.patch("/:id/read", requireAuth, async (req, res) => {
  const notification = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!notification) return res.status(404).json({ error: "Notification not found" });
  if (notification.userId !== req.user!.sub) return res.status(403).json({ error: "Not your notification" });

  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { read: true },
  });

  return res.json(updated);
});

router.post("/send", requireAuth, requireRole("admin"), async (req, res) => {
  const parseResult = sendSchema.safeParse(req.body);
  if (!parseResult.success) return res.status(400).json({ error: parseResult.error.flatten() });

  const { userId, type, content, channel, phone } = parseResult.data;

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  let smsResult;
  if (channel === "sms" && phone) {
    smsResult = await sendSms(phone, content);
  }

  const notification = await prisma.notification.create({
    data: { userId, type, content, channel },
  });

  return res.json({ notification, smsResult });
});

router.post("/broadcast", requireAuth, requireRole("admin"), async (req, res) => {
  const { type, content, channel, region } = req.body;
  if (!type || !content || !channel) {
    return res.status(400).json({ error: "type, content, and channel are required" });
  }

  const where: Record<string, unknown> = {};
  if (region) where.region = region;

  const users = await prisma.user.findMany({ where, select: { id: true } });

  const notifications = await prisma.notification.createMany({
    data: users.map((u) => ({ userId: u.id, type, content, channel })),
  });

  return res.json({ sent: notifications.count });
});

export default router;
