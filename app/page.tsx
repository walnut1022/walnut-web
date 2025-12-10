"use client";

import { WalnutIcon } from "@/components/WalnutIcon";
import TokenBalance from "@/components/TokenBalance";
import VideoTranslator from "@/components/VideoTranslator";
import { useState } from "react";

export default function Home() {
  const [tokens, setTokens] = useState(1240);

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-[#4A3B32] font-sans selection:bg-orange-200">
      {/* 헤더 */}
      <header className="fixed top-0 w-full z-50 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-orange-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <WalnutIcon className="w-9 h-9 text-orange-600" />
            WALNUT
          </h1>
          <div className="flex items-center gap-6">
            <TokenBalance balance={tokens} />
            <button className="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition">
              토큰 충전
            </button>
          </div>
        </div>
      </header>

{/* 히어로 */}
<section className="pt-32 pb-24 px-6">
  <div className="max-w-5xl mx-auto text-center space-y-8">
    <div className="inline-block py-2 px-6 rounded-full bg-orange-100 text-orange-700 text-sm font-bold uppercase tracking-widest">
      English → Korean AI Translation
    </div>

    <h1 className="text-6xl md:text-7xl font-extrabold leading-tight">
      언어의 장벽을<br />
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-700">
        호두 하나
      </span>
      로 깨다
    </h1>

    <p className="text-2xl text-gray-700 font-medium max-w-3xl mx-auto leading-relaxed">
      유튜브 강의, 해외 세미나, 할리우드 영화, 회의 녹음까지<br />
      업로드 한 번으로 <span className="text-orange-600 font-bold">완벽한 한국어 자막</span> 완성
    </p>
  </div>
</section>

{/* 업로더 */}
      <section className="pb-32 px-6">
        <div className="max-w-5xl mx-auto">
          {/* props 없이 그냥 호출 (토큰 기능은 나중에 추가할게!) */}
          <VideoTranslator userTokens={tokens} onTokenUpdate={setTokens} />
        </div>
      </section>

      {/* 저작권 문구 (아주 작게) */}
      <footer className="py-8 text-center">
        <p className="text-xs text-gray-400">
          ※ 저작권이 있는 콘텐츠의 재배포·공유·상업적 이용은 엄격히 금지됩니다.<br />
          WALNUT은 자막 생성만 제공하며, 모든 법적 책임은 업로더에게 있습니다.
        </p>
      </footer>
    </main>
  );
}