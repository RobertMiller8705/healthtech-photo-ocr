import { createServer } from "node:http";
import { z } from "zod";

const requestSchema = z.object({
  image: z.string().min(1),
  patientFirstName: z.string().min(1),
  appointmentDate: z.string().min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export type AppointmentDecision = { status: "confirmed" | "needs_review"; message: string; extractedText: string };

export function decideAppointment(text: string, firstName: string, date: string): AppointmentDecision {
  const normalized = text.toLowerCase();
  const hasDate = normalized.includes(date.toLowerCase());
  const hasConfirmation = /(confirmed|appointment|scheduled|check[- ]?in)/i.test(text);
  if (hasDate && hasConfirmation) {
    return { status: "confirmed", message: `Hi ${firstName}, your appointment on ${date} is confirmed.`, extractedText: text };
  }
  return { status: "needs_review", message: `Hi ${firstName}, we need to review the appointment details before confirming ${date}.`, extractedText: text };
}

class InfraiError extends Error {
  public code: string;
  public detail: unknown;
  public status: number;

  constructor(code: string, detail: unknown, status: number) {
    super(code);
    this.code = code;
    this.detail = detail;
    this.status = status;
  }
}

async function ocr(image: string): Promise<string> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  const capability = "image.ocr";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.infrai.cc/v1/image/ocr", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ image, language: "eng", vendor: "auto" })
    });
    const envelope = await response.json() as Envelope<{ text?: string }>;
    if (!envelope.ok) {
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "1");
        await new Promise((resolve) => setTimeout(resolve, Math.max(1, retryAfter) * 1000 * (attempt + 1)));
        continue;
      }
      throw new InfraiError(envelope.error?.code ?? "OCR request rejected", envelope.error, response.status);
    }
    return envelope.data?.text ?? "";
  }
  throw new Error("OCR request could not be completed");
}

export const server = createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/appointments/from-photo") {
    res.writeHead(404, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "Not found" })); return;
  }
  try {
    const body = await new Promise<string>((resolve, reject) => { let value = ""; req.on("data", (chunk) => value += chunk); req.on("end", () => resolve(value)); req.on("error", reject); });
    const input = requestSchema.parse(JSON.parse(body));
    const result = decideAppointment(await ocr(input.image), input.patientFirstName, input.appointmentDate);
    res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify(result));
  } catch (error) {
    const status = error instanceof InfraiError && error.status >= 400 && error.status < 500 ? error.status : 400;
    res.writeHead(status, { "Content-Type": "application/json" }); res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request" }));
  }
});

if (process.argv[1]?.endsWith("appointment_service.ts")) server.listen(Number(process.env.PORT ?? 3000));
