import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import morgan from "morgan";
import { createProxyMiddleware } from "http-proxy-middleware";

import "./src/utils/version-check.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const PORT = process.env.PORT     || 3000;
const ENV  = process.env.NODE_ENV || "development";

const API_BASE_URL = process.env.API_BASE_URL ?? '';
const INTERNAL_KEY = process.env.INTERNAL_KEY  ?? '';

const loggerFormat = ENV === "production" ? "combined" : "dev";
app.use(morgan(loggerFormat));

// ── Endpoint config untuk browser ─────────────────────────────────────────────
// Hanya kirim API_BASE_URL — INTERNAL_KEY tidak dikirim ke browser sama sekali
app.get('/config', (_req, res) => res.json({
  API_BASE_URL: '',  // kosong karena semua request lewat proxy /api
}));

// ── Proxy /api/* ke backend ────────────────────────────────────────────────────
// Browser tidak tahu API_BASE_URL dan INTERNAL_KEY — Express yang inject
app.use(
  '/api',
  createProxyMiddleware({
    target: API_BASE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api${path}`,
    on: {
      proxyReq: (proxyReq, req) => {
        // Inject internal key — tidak pernah sampai ke browser
        proxyReq.setHeader('x-internal-key', INTERNAL_KEY);

        // Forward Authorization: Bearer dari browser ke backend
        const auth = req.headers['authorization'];
        if (auth) proxyReq.setHeader('authorization', auth);
      },
      error: (err, req, res) => {
        console.error('[proxy error]', err.message);
        res.status(502).json({ status: 'error', pesan: 'Proxy error: ' + err.message });
      },
    },
  })
);

app.use("/src",    express.static(path.join(__dirname, "src")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "pages"), { extensions: ["html"] }));

app.get("/", (_req, res) =>
  res.sendFile(path.join(__dirname, "pages", "index.html")));

app.get("/auth/login",          (_req, res) => res.sendFile(path.join(__dirname, "pages", "auth", "login.html")));
app.get("/auth/admin-login",    (_req, res) => res.sendFile(path.join(__dirname, "pages", "auth", "admin-login.html")));
app.get("/auth/lupa-sandi",     (_req, res) => res.sendFile(path.join(__dirname, "pages", "auth", "lupa-sandi.html")));
app.get("/auth/verifikasi-otp", (_req, res) => res.sendFile(path.join(__dirname, "pages", "auth", "verifikasi-otp.html")));
app.get("/auth/sandi-baru",     (_req, res) => res.sendFile(path.join(__dirname, "pages", "auth", "sandi-baru.html")));

app.get("/admin/dashboard-admin", (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "dashboard-admin.html")));
app.get("/admin/kamar",           (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "kamar.html")));
app.get("/admin/pengumuman",      (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "pengumuman.html")));
app.get("/admin/penghuni",        (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "penghuni.html")));
app.get("/admin/tagihan",         (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "tagihan.html")));
app.get("/admin/pembayaran",      (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "pembayaran.html")));
app.get("/admin/booking",         (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "booking.html")));
app.get("/admin/laporan",         (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "laporan.html")));
app.get("/admin/profile",         (_req, res) => res.sendFile(path.join(__dirname, "pages", "admin", "profile.html")));

// Penyewa
app.get("/dashboard-penghuni",    (_req, res) => res.sendFile(path.join(__dirname, "pages", "penghuni", "dashboard-penghuni.html")));

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
