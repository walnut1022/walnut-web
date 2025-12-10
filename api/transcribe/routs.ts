// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import AssemblyAI from "assemblyai";

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY!,
});

export const POST = async (req: NextRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일이 없습니다" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const transcript = await client.transcripts.transcribe({
      audio: buffer,
      language_detection: true,
      speaker_labels: true,
    });

    if (transcript.status === "error") {
      return NextResponse.json({ error: transcript.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      text: transcript.text,
      words: transcript.words,
      duration: transcript.audio_duration,
    });
  } catch (error: any) {
    console.error("AssemblyAI error:", error);
    return NextResponse.json({ error: error.message || "서버 오류" }, { status: 500 });
  }
};

export const config = {
  api: {
    bodyParser: false, // 필수! 파일 업로드 때문에
  },
};