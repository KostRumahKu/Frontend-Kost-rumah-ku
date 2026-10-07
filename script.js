import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import morgan from "morgan";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3200;
const ENV = process.env.NODE_ENV || "development";

const loggerFormat = ENV === "production" ? "combined" : "dev";
app.use(morgan(loggerFormat));

app.use("/src", express.static(path.join(__dirname, "src")));
app.use("/public", express.static(path.join(__dirname, "public")));

app.use(express.static(path.join(__dirname, "pages"), { extensions: ["html"] }));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pages", "index.html"));
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});