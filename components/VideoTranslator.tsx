// components/VideoTranslator.tsx
"use client";

import { useState } from "react";
import { Upload, Film, Clock, Zap } from "lucide-react";

export default function VideoTranslator({ userTokens, onTokenUpdate }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(0); // 초 단위
  const [isFast, setIsFast] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // 토큰 계산 로직
  const calculateTokens = () => {
    if (!duration) return 0;
    const minutes = Math.ceil(duration / 60);
    let tokens = minutes * 25; // 1분당 25토큰
    if (isFast) tokens = Math.ceil(tokens * 1.4);
    if (isCustom) tokens += minutes * 5;
    return tokens;
  };

  const neededTokens = calculateTokens();
  const hasEnough = userTokens >= neededTokens;

  return (
    <div className="bg-white rounded-3xl shadow-2xl p-10 border border-orange-100">
      <div className="space-y-8">
        {/* 드래그 앤 드롭 */}
        <div
          className="border-4 border-dashed border-orange-200 rounded-2xl p-16 text-center hover:border-orange-400 transition"
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped?.type.startsWith("video/")) {
              setFile(dropped);
              // 실제론 여기서 duration 추출 (ffprobe나 브라우저 API)
              // 임시로 120분 영화 테스트
              setDuration(7200);
            }
          }}
          onDragOver={(e) => e.preventDefault()}
        >
          <Upload className="w-16 h-16 mx-auto text-orange-500 mb-4" />
          <p className="text-2xl font-bold">영상을 여기로 끌어오세요</p>
          <p className="text-gray-500 mt-2">최대 10GB · MP4, MOV, AVI 지원</p>
          <button className="mt-6 bg-orange-500 text-white px-8 py-4 rounded-full font-bold hover:bg-orange-600">
            파일 선택
          </button>
        </div>

        {file && (
          <>
            <div className="bg-orange-50 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Film className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="font-bold text-xl">{file.name}</p>
                    <p className="text-gray-600">
                      {Math.round(duration / 60)}분 영상 · 4K 감지
                    </p>
                  </div>
                </div>
                <span className="text-3xl font-black text-orange-600">
                  {neededTokens.toLocaleString()} 토큰
                </span>
              </div>

              {/* 옵션 */}
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isFast} onChange={(e) => setIsFast(e.target.checked)} className="w-5 h-5" />
                  <div>
                    <Zap className="w-5 h-5 text-yellow-500 inline mr-1" />
                    <span className="font-bold">초고속 처리</span> (+40%)
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={isCustom} onChange={(e) => setIsCustom(e.target.checked)} className="w-5 h-5" />
                  <span className="font-bold">자막 커스텀</span> (+20%)
                </label>
              </div>

              {/* 토큰 부족 경고 */}
              {!hasEnough && neededTokens > 0 && (
                <p className="text-red-600 font-bold text-center py-4 bg-red-50 rounded-xl">
                  토큰이 {neededTokens - userTokens}개 부족해요!
                </p>
              )}

              <button
                disabled={!hasEnough}
                className={`w-full py-5 rounded-2xl font-black text-xl transition ${
                  hasEnough
                    ? "bg-gradient-to-r from-orange-500 to-red-600 text-white hover:shadow-2xl"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {hasEnough ? "번역 시작하기" : "토큰 충전하고 시작하기"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}