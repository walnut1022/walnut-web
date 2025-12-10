"use client";

import { useState } from "react";

interface Props {
  userTokens: number;
  onTokenUpdate: (tokens: number) => void;
}

export default function VideoTranslator({ userTokens, onTokenUpdate }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(""); // 다운로드 링크 저장

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("파일을 선택해주세요!");
    setLoading(true);
    setDownloadUrl("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // responseType을 blob으로 설정하지 않고, fetch 후 blob()으로 변환
      const res = await fetch("http://localhost:8000/upload/video", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("서버 에러 발생");

      // 파일 데이터(Blob) 받기
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      setDownloadUrl(url); // 다운로드 버튼 활성화
      
      onTokenUpdate(userTokens - 50); // 고급 기능이니 토큰 더 차감

    } catch (error) {
      console.error(error);
      alert("영상 변환 실패. 서버 로그를 확인하세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-orange-100 text-center">
      <div className="mb-6">
        <input 
          type="file" 
          accept="video/mp4" 
          onChange={handleFileChange}
          className="block w-full text-sm text-slate-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-orange-50 file:text-orange-700
            hover:file:bg-orange-100
          "
        />
      </div>

      <button 
        onClick={handleUpload}
        disabled={loading || !file}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all
          ${loading 
            ? "bg-gray-300 cursor-not-allowed text-gray-500" 
            : "bg-orange-600 hover:bg-orange-700 text-white shadow-md hover:shadow-lg"
          }`}
      >
        {loading ? "AI가 영상을 분석하고 자막을 합성 중... (오래 걸림)" : "자막 영상 생성하기 (50 토큰)"}
      </button>

      {/* 완료 시 다운로드 버튼 및 미리보기 표시 */}
      {downloadUrl && (
        <div className="mt-8 animate-fade-in space-y-4">
          <h3 className="text-xl font-bold text-orange-800">🎉 완성된 영상</h3>
          
          <video controls src={downloadUrl} className="w-full rounded-lg shadow-lg" />
          
          <a 
            href={downloadUrl} 
            download="walnut_translated.mp4"
            className="block w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition"
          >
            📥 내 컴퓨터에 저장하기
          </a>
        </div>
      )}
    </div>
  );
}