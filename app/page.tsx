"use client";

import { useState, useRef } from "react";
import { Upload, FileAudio, FileVideo, X, CheckCircle, MapPin, Nut, Download, AlertCircle } from "lucide-react";

export default function Home() {
  // --------------------------------------------------------
  // 1. 상태 관리
  // --------------------------------------------------------
  const [tokens, setTokens] = useState(100); 
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // 로딩 & 결과 상태
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------
  // 2. 기능 로직
  // --------------------------------------------------------
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setDownloadUrl(null); // 새 파일 올리면 기존 결과 초기화
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setDownloadUrl(null);
    }
  };

  // ★★★ 진짜 서버 통신 함수 ★★★
  const handleProcess = async (type: "video" | "text", cost: number) => {
  if (!file) return alert("파일을 먼저 업로드해주세요!");
  if (tokens < cost) return alert("토큰이 부족합니다! 충전이 필요합니다.");

  setLoading(true);
  setStatusMessage("서버로 파일을 전송하고 있습니다...");
  setDownloadUrl(null);

  try {
    const formData = new FormData();
    formData.append("file", file);

    if (type === "text") {
      // === 텍스트 추출 전용 ===
      const res = await fetch("http://localhost:8000/upload/text", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

      const data = await res.json();

      // 결과 보여주기 (예: 모달이나 화면에 출력)
      alert(`감지된 언어: ${data.language.toUpperCase()}\n\n텍스트:\n${data.text}`);

      setTokens(prev => prev - cost);
      setLoading(false);
      return;
    }

    // === 기존 자막 영상 생성 (video) ===
    const res = await fetch("http://localhost:8000/upload/video", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`서버 오류: ${res.status}`);

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);

    setDownloadUrl(url);
    setTokens(prev => prev - cost);
    alert("🎉 변환 완료! 아래에서 영상을 확인하세요.");

  } catch (error) {
    console.error(error);
    alert("실패했습니다. 서버가 켜져 있는지 확인해주세요!\n" + error);
  } finally {
    setLoading(false);
    setStatusMessage("");
  }
};
  // --------------------------------------------------------
  // 3. UI 렌더링
  // --------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#FDF8F6] font-sans text-[#433D37] pb-20">
      
      {/* --- [Header] --- */}
      <header className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <MapPin className="text-orange-600 w-8 h-8 fill-orange-600" /> 
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#433D37]">
            WALNUT
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-orange-100">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <Nut className="text-orange-600 w-5 h-5 fill-orange-100" />
          </div>
          <div className="flex flex-col items-end leading-none mr-2">
            <span className="text-[10px] text-gray-400 font-bold">보유 호두</span>
            <span className="text-xl font-black text-[#433D37]">{tokens}</span>
          </div>
          <button 
            className="bg-[#433D37] text-white text-xs px-3 py-1.5 rounded-full hover:bg-black transition font-bold"
            onClick={() => setTokens(prev => prev + 100)}
          >
            충전
          </button>
        </div>
      </header>

      {/* --- [Hero Section] --- */}
      <section className="text-center mt-10 mb-10 px-4">
        <span className="inline-block bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest mb-4">
          VIDEO TRANSLATION SERVICE
        </span>
        <h2 className="text-5xl md:text-6xl font-bold mb-6 leading-tight text-[#2A2622]">
          언어의 장벽을<br />
          <span className="text-orange-600">호두 하나</span>로 깨다.
        </h2>
      </section>

      {/* --- [Main Action Area] --- */}
      <section className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-[2rem] shadow-xl border border-orange-100 overflow-hidden">
          
          {/* 1. 파일 업로드 구역 */}
          <div 
            className={`
              relative p-10 text-center transition-all duration-300 ease-in-out border-b border-gray-100
              ${isDragging ? "bg-orange-50 border-orange-300" : "bg-white"}
              ${file ? "bg-[#FDF8F6]" : ""}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              onChange={handleFileSelect}
              accept="video/*,audio/*"
            />

            {!file ? (
              <div className="space-y-3 cursor-pointer py-4" onClick={() => fileInputRef.current?.click()}>
                <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
                  <Upload size={32} strokeWidth={2.5} />
                </div>
                <h3 className="text-xl font-bold text-[#433D37]">파일 업로드</h3>
                <p className="text-gray-400 text-sm">
                  이곳을 클릭하거나 파일을 드래그하세요<br/>
                  <span className="text-xs text-gray-300 mt-1">(MP4, MP3, WAV 지원)</span>
                </p>
              </div>
            ) : (
              <div className="relative py-4">
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setDownloadUrl(null); }}
                  className="absolute top-[-10px] right-[-10px] p-2 text-gray-300 hover:text-red-500 transition"
                >
                  <X />
                </button>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <CheckCircle className="text-green-500 w-6 h-6" />
                  <h3 className="text-lg font-bold text-[#433D37] truncate max-w-[300px]">{file.name}</h3>
                </div>
                <p className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB • 준비 완료</p>
              </div>
            )}
          </div>

          {/* 2. 하단 버튼 영역 */}
          <div className="p-6 bg-gray-50">
            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent mb-4"></div>
                <p className="font-bold text-[#433D37] text-lg animate-pulse">
                  AI 작업 중입니다... 🐿️
                </p>
                <p className="text-sm text-gray-400 mt-2">{statusMessage}</p>
              </div>
            ) : !downloadUrl ? (
              // 결과 없을 때: 버튼들 표시
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => handleProcess("video", 50)}
                  disabled={!file}
                  className={`
                    w-full py-4 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2
                    ${!file 
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                      : "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200"
                    }
                  `}
                >
                  <FileVideo size={20} />
                  자막 영상 생성하기 (50 호두)
                </button>

                <button
                  onClick={() => handleProcess("text", 30)}
                  disabled={!file}
                  className={`
                    w-full py-3 rounded-xl font-bold text-md border-2 transition-all flex items-center justify-center gap-2
                    ${!file 
                      ? "border-gray-200 text-gray-300 cursor-not-allowed bg-transparent" 
                      : "border-gray-200 bg-white text-gray-600 hover:border-orange-300 hover:text-orange-600"
                    }
                  `}
                >
                  <FileAudio size={18} />
                  녹음 텍스트만 추출 (30 호두)
                </button>
              </div>
            ) : (
              // 결과 있을 때: 다운로드 창 표시
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Download size={24} />
                </div>
                <h3 className="text-xl font-bold text-green-800 mb-2">작업 성공!</h3>
                <p className="text-green-600 text-sm mb-4">호두 50개가 정상적으로 사용되었습니다.</p>
                
                {/* 비디오 미리보기 */}
                <video src={downloadUrl} controls className="w-full rounded-lg shadow-sm mb-4 bg-black max-h-[300px]" />
                
                <a 
                  href={downloadUrl}
                  download="walnut_result.mp4"
                  className="block w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition shadow-md"
                >
                  내 컴퓨터에 저장하기
                </a>
                <button 
                  onClick={() => setDownloadUrl(null)}
                  className="mt-3 text-sm text-gray-400 underline hover:text-gray-600"
                >
                  다른 파일 변환하기
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
      <footer className="mt-20 pb-8 text-center">
    <p className="text-[10px] text-gray-400 leading-relaxed max-w-2xl mx-auto px-4">
      © 2025 WALNUT. All rights reserved.<br />
      WALNUT은 업로드된 콘텐츠의 소유권을 주장하지 않습니다. 
      정당하게 구입·구독한 영상에 한하여 개인적인 관람 목적으로만 사용 가능하며, 
      제3자에게 재배포·공유·업로드하는 행위는 저작권법 위반에 해당합니다. 
      저작권 위반으로 인한 모든 법적 책임은 사용자에게 있으며, 
      WALNUT은 이에 대해 일체의 책임을 지지 않습니다.
    </p>
  </footer>


    </main>
  );
}