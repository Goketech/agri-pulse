import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

const SYSTEM_PROMPT = `You are AgriPulse AI Mentor, an agricultural expert specializing in farming practices for Nigeria and Rwanda. You help young agripreneurs with:
- Crop selection and management (cassava, maize, rice, yam, coffee, tea, beans, sorghum)
- Soil health assessment and improvement
- Market prices and value chain optimization
- Equipment and agri-tech adoption
- Business planning and financial literacy for agriculture
- Climate-smart and sustainable farming techniques
Provide practical, actionable advice tailored to West and East African contexts. Keep responses concise and helpful.`;

router.post("/chat", requireAuth, async (req, res) => {
  const { message, sessionId } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) {
    return res.status(403).json({ error: "Only agripreneurs can use AI mentorship" });
  }

  let session;
  let conversationHistory: { role: string; content: string }[] = [];

  if (sessionId) {
    session = await prisma.aIBotSession.findUnique({ where: { id: sessionId } });
    if (session) {
      conversationHistory = JSON.parse(session.conversationJson);
    }
  }

  conversationHistory.push({ role: "user", content: message });

  let assistantMessage: string;

  if (process.env.OPENAI_API_KEY) {
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...conversationHistory.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        max_tokens: 500,
      });
      assistantMessage = completion.choices[0].message.content || "I could not generate a response.";
    } catch (error) {
      console.error(error);
      assistantMessage = "AI service is temporarily unavailable. Please try again later.";
    }
  } else {
    const tips: Record<string, string> = {
      cassava:
        "Cassava thrives in well-drained sandy-loam soils. Plant stem cuttings at 25-30cm length, angled at 45 degrees. Space plants 1m apart in rows 1m apart. Harvest at 8-12 months for best starch content.",
      maize:
        "For maize in Nigeria/Rwanda, prepare land early before rains. Use improved varieties like SAMMAZ or TZPB-SR. Apply NPK 15-15-15 at 4 bags/ha at planting, then top-dress with urea at knee height.",
      rice: "Lowland rice varieties like FARO 44 perform well in Nigeria. For Rwanda, try Komboka or NERICA varieties. Ensure proper water management—maintain 5-10cm standing water during vegetative growth.",
      soil: "Get your soil tested at the nearest agricultural extension office. Key indicators: pH 6.0-7.0 is ideal for most crops. Organic matter above 3% indicates good fertility. Use cover crops and composting to improve soil health.",
      price:
        "Track market prices through local agricultural commodity exchanges. For Nigeria: Lagos Commodities Exchange. For Rwanda: East Africa Grain Council. Sell during off-peak to get better margins.",
    };

    const key = Object.keys(tips).find((k) => message.toLowerCase().includes(k));
    assistantMessage = key
      ? tips[key]
      : `Great question about "${message.slice(0, 50)}". While the AI service needs an OpenAI API key to provide personalized responses, here are general tips: Focus on crops suited to your region's climate and soil. Connect with local agricultural extension officers for hands-on guidance. Consider joining a cooperative for better market access and shared resources.`;
  }

  conversationHistory.push({ role: "assistant", content: assistantMessage });

  if (session) {
    session = await prisma.aIBotSession.update({
      where: { id: session.id },
      data: { conversationJson: JSON.stringify(conversationHistory) },
    });
  } else {
    session = await prisma.aIBotSession.create({
      data: {
        agripreneurId: agripreneur.id,
        conversationJson: JSON.stringify(conversationHistory),
      },
    });
  }

  return res.json({ sessionId: session.id, reply: assistantMessage, conversation: conversationHistory });
});

router.get("/sessions", requireAuth, async (req, res) => {
  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.json({ sessions: [] });

  const sessions = await prisma.aIBotSession.findMany({
    where: { agripreneurId: agripreneur.id },
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      preview: JSON.parse(s.conversationJson)[0]?.content?.slice(0, 80) || "",
      messageCount: JSON.parse(s.conversationJson).length,
      createdAt: s.createdAt,
    })),
  });
});

router.get("/sessions/:id", requireAuth, async (req, res) => {
  const session = await prisma.aIBotSession.findUnique({ where: { id: req.params.id } });
  if (!session) return res.status(404).json({ error: "Session not found" });

  return res.json({
    id: session.id,
    conversation: JSON.parse(session.conversationJson),
    createdAt: session.createdAt,
  });
});

router.post("/match", requireAuth, async (req, res) => {
  const { cropInterest } = req.body;

  const mentors = await prisma.mentor.findMany({
    where: cropInterest
      ? {
          OR: [
            { expertise: { contains: cropInterest, mode: "insensitive" } },
            { cropValueChain: { contains: cropInterest, mode: "insensitive" } },
          ],
        }
      : {},
    include: {
      user: { select: { name: true, email: true, region: true } },
      _count: { select: { assignedAgripreneurs: true } },
    },
    orderBy: { yearsOfExperience: "desc" },
    take: 5,
  });

  return res.json({
    mentors: mentors.map((m) => ({
      id: m.id,
      name: m.user.name,
      email: m.user.email,
      region: m.user.region,
      expertise: m.expertise,
      cropValueChain: m.cropValueChain,
      yearsOfExperience: m.yearsOfExperience,
      assignedCount: m._count.assignedAgripreneurs,
    })),
  });
});

router.post("/assign", requireAuth, async (req, res) => {
  const { mentorId } = req.body;
  if (!mentorId) return res.status(400).json({ error: "mentorId is required" });

  const agripreneur = await prisma.agripreneur.findUnique({ where: { userId: req.user!.sub } });
  if (!agripreneur) return res.status(403).json({ error: "Only agripreneurs can request mentor assignment" });

  const mentor = await prisma.mentor.findUnique({ where: { id: mentorId } });
  if (!mentor) return res.status(404).json({ error: "Mentor not found" });

  await prisma.agripreneur.update({
    where: { id: agripreneur.id },
    data: { mentorId: mentor.id },
  });

  return res.json({ success: true, message: "Mentor assigned" });
});

export default router;
