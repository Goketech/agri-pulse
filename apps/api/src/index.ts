import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRouter from "./routes/auth";
import mentorshipRouter from "./routes/mentorship";
import marketplaceRouter from "./routes/marketplace";
import analyticsRouter from "./routes/analytics";
import learningRouter from "./routes/learning";
import notificationsRouter from "./routes/notifications";

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agripulse-api" });
});

app.use("/auth", authRouter);
app.use("/mentorship", mentorshipRouter);
app.use("/marketplace", marketplaceRouter);
app.use("/analytics", analyticsRouter);
app.use("/learning", learningRouter);
app.use("/notifications", notificationsRouter);

app.listen(PORT, () => {
  console.log(`AgriPulse API listening on port ${PORT}`);
});
