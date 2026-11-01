import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import morgan from "morgan";


import "./src/utils/version-check.js";


dotenv.config();

// Variabel env yang aman untuk dikirim ke client (JANGAN sertakan JWT secret atau credential sensitif lainnya).
const CLIENT_ENV = {
  API_BASE_URL: process.env.API_BASE_URL ?? '',
  INTERNAL_KEY:  process.env.INTERNAL_KEY  ?? '',
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || "development";

const loggerFormat = ENV === "production" ? "combined" : "dev";
app.use(morgan(loggerFormat));

// Endpoint untuk inject env ke client browser via window.__ENV__
app.get('/api/client-config', (_req, res) => {
  res.json(CLIENT_ENV);
});

app.use("/src", express.static(path.join(__dirname, "src")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "pages"), { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

// ── Route eksplisit per halaman ──────────────────────────────────────────────
// Penyewa
app.get("/auth/login", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "auth", "login.html")));

// Owner + Admin (gabungan)
app.get("/auth/admin-login", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "auth", "admin-login.html")));

// Dashboard admin
app.get("/admin/dashboard-admin", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "admin", "dashboard-admin.html")));

app.get("/admin/kamar", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "admin", "kamar.html")));

app.get("/admin/pengumuman", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "admin", "pengumuman.html")));

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});