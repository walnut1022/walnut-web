// src/app/api/transcribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { AssemblyAI } from "assemblyai";

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

    // 이 부분만 고침! transcript.error는 문자열임
    if (transcript.status === "error") {
      return NextResponse.json(
        { error: transcript.error || "처리 중 알 수 없는 오류 발생" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      text: transcript.text || "음성이 감지되지 않았습니다",
      words: transcript.words || [],
      duration: transcript.audio_duration || 0,
    });
  } catch (error: any) {
    console.error("AssemblyAI Error:", error);
    return NextResponse.json(
      { error: error.message || "서버 오류 발생" },
      { status: 500 }
    );
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};