// src/components/VideoTranslator.tsx
"use client";

import { useState, useRef } from "react";
import { Upload, Film } from "lucide-react";

export default function VideoTranslator({ userTokens, onTokenUpdate }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasEnough = userTokens >= 250; // 임시로 250토큰 기준

  // 파일 선택 버튼 클릭 → 내 컴퓨터 창 뜸
  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 선택했을 때 실행
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && (selected.type.startsWith("video/") || selected.type.startsWith("audio/"))) {
  };

  // 드래그 앤 드롭
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
        alert(`성공! ${Math.round(data.duration / 60)}분 영상 자막 추출 완료`);
      } else {
        alert("에러: " + data.error);
      }
    } catch (error) {
      alert("업로드 실패");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 border border-orange-100">
      {/* 숨겨진 input (버튼으로 트리거) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="video/*,audio/*"
        className="hidden"
      />

      {/* 드래그 앤 드롭 영역 */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={handleButtonClick}
        className="border-4 border-dashed border-orange-300 rounded-2xl p-20 text-center cursor-pointer hover:border-orange-500 transition bg-orange-50/30"
      >
        <Upload className="w-20 h-20 mx-auto text-orange-600 mb-6" />
        <p className="text-3xl font-black text-gray-800">영상 또는 음성을 올려주세요</p>
        <p className="text-lg text-gray-600 mt-3">클릭하거나 드래그 앤 드롭 (MP4, MOV, MP3, WAV 등)</p>
      </div>

      {/* 선택된 파일 있으면 보여주기 */}
      {file && (
        <div className="mt-8 p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl border border-orange-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Film className="w-12 h-12 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{file.name}</p>
                <p className="text-gray-600">{(file.size / 1024 / 1024 / 1024).toFixed(1)} MB</p>
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
              {isProcessing ? "자막 만드는 중..." : "한국어 자막 만들기"}
            </button>
          </div>
        </div>
      )}

{/* 결과 보여주기 */}
      {result && (
        <div className="mt-8 p-8 bg-green-50 rounded-2xl border-2 border-green-300">
          <h3 className="text-2xl font-bold text-green-800 mb-4">자막 추출 성공!</h3>
          <pre className="text-sm bg-white p-6 rounded-lg overflow-auto max-h-96">
            {result.text || "텍스트를 가져오지 못했어요"}
          </pre>
          <p className="text-gray-600 mt-4">
            총 {Math.round((result.duration || 0) / 60)}분 영상 ·{" "}
            화자 수:{" "}
            {(() => {
              if (!result.words || result.words.length === 0) return "1";
              const speakers = new Set(result.words.map((w: any) => w.speaker));
              return speakers.size;
            })()}명
          </p>
        </div>
      )}
    </div>
  );
 }
}