import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRouter from "./routes/auth";

dotenv.config();

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "agripulse-api" });
});

app.use("/auth", authRouter);

// TODO: mount routers for mentorship, marketplace, analytics, learning

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`AgriPulse API listening on port ${PORT}`);
});

