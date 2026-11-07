import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { blockedBody, blockedHtml, productionBlocked } from "../lib/production-gate.mjs";

process.env.NODE_ENV ||= "production";
const port = Number(process.env.PORT || 3000);
const app = next({ dev: false, hostname: "0.0.0.0", port });
const handle = app.getRequestHandler();

await app.prepare();
createServer((req, res) => {
  const pathname = (req.url || "/").split("?")[0] || "/";
  if (productionBlocked()) {
    res.statusCode = 503;
    res.setHeader("cache-control", "no-store");
    const body = blockedBody(pathname);
    if (body) {
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
      return;
    }
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(blockedHtml);
    return;
  }
  handle(req, res, parse(req.url || "/", true));
}).listen(port, "0.0.0.0");
