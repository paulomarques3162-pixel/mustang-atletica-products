import { Router, Request } from "express";
import { asyncHandler } from "../../lib/asyncHandler";
import { getPaymentProvider } from "../providers/registry";
import { processWebhook } from "../services/payment.service";
import { logger } from "../../lib/logger";

export const paymentWebhookRouter = Router();

/**
 * POST /api/webhooks/payment
 *
 * Fluxo: Provider → Webhook → validação de assinatura → idempotência →
 *        Transaction → Payment → Order → Inventory.
 *
 * O corpo cru (raw) é validado por HMAC; nunca confiamos no frontend.
 */
paymentWebhookRouter.post(
  "/payment",
  asyncHandler(async (req: Request, res) => {
    const provider = getPaymentProvider();
    const rawBody =
      (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});

    const headers: Record<string, string | undefined> = {
      "x-mock-signature": req.header("x-mock-signature") ?? undefined,
      "x-signature": req.header("x-signature") ?? undefined,
      "x-hub-signature-256": req.header("x-hub-signature-256") ?? undefined,
      "x-webhook-secret": req.header("x-webhook-secret") ?? undefined,
      "stripe-signature": req.header("stripe-signature") ?? undefined,
    };

    try {
      const result = await processWebhook(provider, rawBody, headers);
      return res.status(200).json({ received: true, ...result });
    } catch (err) {
      logger.warn({ err, provider: provider.name }, "webhook_rejected");
      throw err;
    }
  }),
);
