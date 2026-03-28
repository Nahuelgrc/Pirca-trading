import http from "http";
import { startAgent } from "./engine.js";

// Web Server to keep Cloud App alive (Railway Healthcheck)
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Pirca Trading Agent is perfectly running 24/7.\n");
}).listen(Number(port), "0.0.0.0", () => {
  console.log(`🌐 Cloud Healthcheck Server listening on 0.0.0.0:${port}`);
});

// Launch the Core Execution Engine
startAgent();
