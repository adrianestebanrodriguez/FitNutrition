import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import handler from "./api/index.js";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
const app = express();

app.use(express.json());

app.all("/api/*", async (req, res) => {
  (req as any).body = req.body || {};
  await handler(req as any, res as any);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Corriendo de manera segura en http://localhost:${PORT}`);
  });
}

startServer();
