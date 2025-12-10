"use client";

import { useState, useRef } from "react";
// 1. 여기서 'Nut' 아이콘을 추가로 불러왔습니다.
import { Upload, FileAudio, FileVideo, X, CheckCircle, MapPin, Nut, Download } from "lucide-react";

export default function Home() {
  // --------------------------------------------------------
  // 1. 상태 관리 (State)
  // --------------------------------------------------------
  const [tokens, setTokens] = useState(100); 
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processType, setProcessType] = useState<"video" | "text" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --------------------------------------------------------
  // 2. 기능 로직 (Handlers)
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
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleProcess = async (type: "video" | "text", cost: number) => {
    if (!file) return alert("파일을 먼저 업로드해주세요!");
    if (tokens < cost) return alert("토큰이 부족합니다! 충전이 필요합니다.");

    const confirmMsg = type === "video" 
      ? `자막 영상을 생성하시겠습니까? (토큰 -${cost})` 
      : `텍스트만 추출하시겠습니까? (토큰 -${cost})`;
      
    if (confirm(confirmMsg)) {
      setTokens((prev) => prev - cost);
      setLoading(true);
      setProcessType(type);

      // 백엔드 연동 시뮬레이션 (3초)
      setTimeout(() => {
        setLoading(false);
        setProcessType(null);
        alert(type === "video" ? "영상 변환 완료!" : "텍스트 추출 완료!");
      }, 3000);
    }
  };

  // --------------------------------------------------------
  // 3. UI 렌더링
  // --------------------------------------------------------
  return (
    <main className="min-h-screen bg-[#FDF8F6] font-sans text-[#433D37]">
      
      {/* --- [Header] --- */}
      <header className="flex justify-between items-center px-8 py-6 max-w-6xl mx-auto">
        {/* 왼쪽: 로고 영역 */}
        <div className="flex items-center gap-2">
          <MapPin className="text-orange-600 w-8 h-8 fill-orange-600" /> 
          <h1 className="text-3xl font-extrabold tracking-tighter text-[#433D37]">
            WALNUT
          </h1>
        </div>

        {/* 오른쪽: 토큰 UI (호두 아이콘 적용) */}
        <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-full shadow-sm border border-orange-100">
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            {/* ✨ 여기가 변경되었습니다: 호두(Nut) 아이콘 사용 */}
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
      <section className="max-w-2xl mx-auto px-4 pb-20">
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
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
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
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-orange-500 border-t-transparent mb-3"></div>
                <p className="font-bold text-[#433D37]">
                  {processType === 'video' ? 'AI가 영상을 굽는 중...' : '텍스트를 받아적는 중...'}
                </p>
              </div>
            ) : (
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
                  회의 녹음 텍스트만 추출 (30 호두)
                </button>
              </div>
            )}
          </div>

        </div>
        
        <p className="text-center text-xs text-gray-300 mt-6">
          Powered by Walnut AI • Secure & Copyright Free
        </p>
      </section>
    </main>
  );
}