import { NextResponse } from "next/server";
import Groq from "groq-sdk";
import { z } from "zod";
import { getUserIdFromRequest, requireUser } from "@/lib/auth";

const BodySchema = z.object({ text: z.string().min(1), voice: z.string().optional() });

export async function POST(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    requireUser(userId);

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    // @ts-expect-error types may vary by model
    const audio = await client.audio.speech.create({
      model: process.env.GROQ_MODEL_TTS || "whisper-large-v3",
      voice: parsed.data.voice || "alloy",
      input: parsed.data.text,
      format: "mp3",
    });

    // Some SDKs return a Response/Blob-like; normalize to ArrayBuffer
    const arrayBuffer = typeof (audio as any).arrayBuffer === 'function'
      ? await (audio as any).arrayBuffer()
      : Buffer.from(audio as any);

    return new NextResponse(arrayBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    const status = err?.status ?? 500;
    return NextResponse.json({ error: err?.message ?? "Internal Error" }, { status });
  }
}


