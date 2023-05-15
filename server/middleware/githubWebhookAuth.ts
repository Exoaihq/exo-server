import { NextFunction, Request, Response } from "express";
import { exoGithubAppWebhookSecret } from "../../utils/envVariable";
const crypto = require("crypto");

export type RequestWithRawBody = Request & Record<string, any>;

const sigHeaderName = "X-Hub-Signature-256";
const sigHashAlg = "sha256";

export function verifyGithubWebhook(
  req: RequestWithRawBody,
  res: Response,
  next: NextFunction
) {
  if (!req.rawBody) {
    return next("Request body empty");
  }

  const sig = Buffer.from(req.get(sigHeaderName) || "", "utf8");
  const hmac = crypto.createHmac(sigHashAlg, exoGithubAppWebhookSecret);
  const digest = Buffer.from(
    sigHashAlg + "=" + hmac.update(req.rawBody).digest("hex"),
    "utf8"
  );
  if (sig.length !== digest.length || !crypto.timingSafeEqual(digest, sig)) {
    return next(
      `Request body digest (${digest}) did not match ${sigHeaderName} (${sig})`
    );
  }

  return next();
}
