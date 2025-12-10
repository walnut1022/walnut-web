// components/VideoTranslator.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Film } from "lucide-react";

interface VideoTranslatorProps {
  userTokens: number;
  onTokenUpdate: (newTokens: number) => void;
}

export default function VideoTranslator({ userTokens, onTokenUpdate }: VideoTranslatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1분당 25토큰 (10분 = 250토큰, 2시간 = 3000토큰)
  const calculateRequiredTokens = () => {
    if (!file) return 0;
    // 실제로는 파일 메타데이터에서 duration 가져와야 하지만, 지금은 임시로 10분 가정
    // 나중에 ffprobe-wasm으로 정확히 계산할게
    return 250;
  };

  const requiredTokens = calculateRequiredTokens();
  const hasEnough = userTokens >= requiredTokens;

  const handleButtonClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.type.startsWith("video/") || selected.type.startsWith("audio/"))) {
      setFile(selected);
    } else if (selected) {
      alert("영상 또는 음성 파일만 가능합니다");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped && (dropped.type.startsWith("video/") || dropped.type.startsWith("audio/"))) {
      setFile(dropped);
    }
  };

  const handleUpload = async () => {
    if (!file || !hasEnough) return;

    setIsProcessing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();

      if (data.success) {
        setResult(data);
        onTokenUpdate(userTokens - requiredTokens); // 실제 토큰 차감
        alert("자막 추출 성공! 토큰이 차감되었습니다");
      } else {
        alert("실패: " + data.error);
      }
    } catch (error) {
      alert("업로드 중 오류 발생");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 border border-orange-100">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,audio/*"
        className="hidden"
      />

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="relative border-4 border-dashed border-orange-300 rounded-2xl p-20 text-center bg-orange-50/30"
      >
        <div className="absolute inset-0 rounded-2xl" />
        <Upload className="w-20 h-20 mx-auto text-orange-600 mb-6" />
        <p className="text-3xl font-black text-gray-800">영상 또는 음성을 올려주세요</p>
        <p className="text-lg text-gray-600 mt-3">드래그 앤 드롭하거나 아래 버튼 클릭</p>
        <button
          onClick={handleButtonClick}
          className="mt-8 px-10 py-4 bg-orange-600 text-white font-bold text-xl rounded-2xl hover:bg-orange-700 transition shadow-lg"
        >
          내 컴퓨터에서 파일 선택
        </button>
      </div>

      {file && (
        <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Film className="w-12 h-12 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{file.name}</p>
                <p className="text-gray-600">필요 토큰: {requiredTokens}개 (잔액: {userTokens}개)</p>
              </div>
            </div>
            <button
              onClick={handleUpload}
              disabled={!hasEnough || isProcessing}
              className={`px-10 py-5 rounded-2xl font-black text-xl transition ${
                hasEnough && !isProcessing
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-2xl"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"
              }`}
            >
              {isProcessing ? "처리 중..." : "한국어 자막 만들기"}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-8 p-8 bg-green-50 rounded-2xl border-2 border-green-300">
          <h3 className="text-2xl font-bold text-green-800 mb-4">자막 추출 성공!</h3>
          <pre className="text-sm bg-white p-6 rounded-lg overflow-auto max-h-96">
            {result.text || "내용 없음"}
          </pre>
          <p className="text-gray-600 mt-4">
            총 {Math.round((result.duration || 0) / 60)}분 · 화자 수: {result.words?.length > 0 ? new Set(result.words.map((w: any) => w.speaker)).size : 1}명
          </p>
        </div>
      )}
    </div>
  );
}