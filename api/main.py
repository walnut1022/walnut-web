import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv
import google.generativeai as genai
from openai import OpenAI
import math
import uuid
import shutil
import subprocess
import json
import asyncio
import re

# ========================================================
# 기본 설정
# ========================================================
current_dir = Path(__file__).resolve().parent
env_path = current_dir / ".env"
upload_dir = current_dir / "tempuploads"

if env_path.exists():
    load_dotenv(dotenv_path=env_path)

upload_dir.mkdir(exist_ok=True)

# FFmpeg 경로
local_ffmpeg = current_dir / "ffmpeg.exe"
FFMPEG_CMD = str(local_ffmpeg) if local_ffmpeg.exists() else "ffmpeg"

app = FastAPI()

# CORS 필수!!!
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

GEMINI_MODEL = "gemini-3-pro-preview"  # 최신 버전으로 강제

def format_timestamp(seconds):
    hours = math.floor(seconds / 3600)
    seconds %= 3600
    minutes = math.floor(seconds / 60)
    seconds %= 60
    ms = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{ms:03d}"

# --------------------------------------------------------
# 자막 분할 (그대로 잘 됨)
# --------------------------------------------------------
def regroup_words_dynamic(words):
    segments = []
    current = {"text": "", "start": 0, "end": 0, "words": []}
    MAX_SILENCE = 0.3
    MAX_CHARS = 35

    for word_obj in words:
        word = word_obj.word
        start = word_obj.start
        end = word_obj.end

        if current["words"]:
            silence = start - current["words"][-1].end
            if silence > MAX_SILENCE:
                current["end"] = current["words"][-1].end
                segments.append(current)
                current = {"text": "", "start": start, "end": 0, "words": []}

        if not current["words"]:
            current["start"] = start
        current["text"] += word
        current["words"].append(word_obj)
        current["end"] = end

        too_long = len(current["text"]) > MAX_CHARS
        sentence_end = word.strip() and word.strip()[-1] in ".?!"

        if too_long or sentence_end:
            segments.append(current)
            current = {"text": "", "start": 0, "end": 0, "words": []}

    if current["words"]:
        segments.append(current)
    return segments

# --------------------------------------------------------
# Gemini 번역 (완전 방어형)
# --------------------------------------------------------
def translate_batch_gemini(segments, genre_guide):
    input_data = [{"id": i, "text": seg["text"]} for i, seg in enumerate(segments)]
    
    prompt = f"""
    너는 **한국인이 가장 자연스럽게 말하는 방식**으로 영어를 한국어로 번역하는 최고의 AI 번역가야.

    [장르·상황 분석 결과]
    {genre_guide}

    [번역 원칙] — 이건 무조건 지켜!
    1. "{genre_guide}"를 반드시 참고해서 톤을 맞춰.
    - 강의면 → 설명하는 말투, 존칭 적절히
    - 브이로그·유튜브면 → 완전 반말, 친구랑 얘기하듯이, "ㅋㅋ", "진짜", "완전" 같은 감탄사도 OK
    - 영화·드라마면 → 인물 성격과 감정 살려서 구어체 반말 or 존댓말
    - 다큐면 → 차분하고 정확한 설명체
    - 게임 스트리밍이면 → "와 이거 개쩐다", "미쳤네" 이런 말도 써

    2. **문어체, 책 말투 왠만해서는 쓰지 마** → "입니다", "합니다" 같은 거 가능한 빼고 말하듯이 해
    3. 한국 사람이 진짜로 쓰는 띄어쓰기, 줄임말, 구어체 완벽히 살려 (예: "그니까" 대신 "그러니까" X, "아니" 대신 "아니야" O)
    4. 감정, 웃음, 놀람, 화남 같은 건 그대로 살려! (ㅋㅋㅋ, !!!, ... 도 적극 사용)

번역할 텍스트 (순서 절대 바꾸지 마):

    [가이드]
    {genre_guide}

    번역할 텍스트:
    {json.dumps(input_data, ensure_ascii=False)}

    출력은 반드시 다음 JSON 형식만 출력하세요. 마크다운 ``` 빼고, 설명도 빼고:
    [{{"id": 0, "ko": "번역문1"}}, {{"id": 1, "ko": "번역문2"}}]
    """

    try:
        model = genai.GenerativeModel(
            model_name=GEMINI_MODEL,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.7
            }
        )
        response = model.generate_content(prompt)
        raw = response.text.strip()

        print(f"[Gemini 응답] {raw[:500]}")  # 디버그용

        # 마크다운 제거
        if "```" in raw:
            raw = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
            raw = raw.group(1) if raw else raw

        data = json.loads(raw)

        # 키 보정
        result = []
        for i, item in enumerate(data):
            ko_text = item.get("ko") or item.get("korean") or item.get("text") or "번역없음"
            result.append({"id": item.get("id", i), "ko": ko_text})
        return result

    except Exception as e:
        print(f"Gemini 완전 실패: {e}")
        return [{"id": d["id"], "ko": d["text"] + " (번역실패)"} for d in input_data]

# --------------------------------------------------------
# 메인 엔드포인트
# --------------------------------------------------------
@app.post("/upload/video")
async def upload_video(file: UploadFile = File(..., max_size=10_000_000_000)):
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.mp4"
    file_path = upload_dir / filename
    audio_path = upload_dir / f"{file_id}.mp3"
    srt_path = upload_dir / f"{file_id}.srt"
    output_path = upload_dir / f"subtitled_{file_id}.mp4"

    try:
        # 1. 파일 저장
        print("파일 저장 중...")
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        print(f"✅ 파일 저장 완료: {file_path}")

        # 2. 오디오 추출 (FFmpeg)
        print("오디오 추출 중...")
        subprocess.run([
            FFMPEG_CMD, "-y", "-i", str(file_path), 
            "-vn", "-acodec", "libmp3lame", str(audio_path)
        ], check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
        print(f"✅ 오디오 추출 완료: {audio_path}")

        # 3. Whisper STT
        print("Whisper STT 시작...")
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        
        if not openai_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY가 .env에 없습니다!")
        if not gemini_key:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY가 .env에 없습니다!")
        
        client = OpenAI(api_key=openai_key)
        genai.configure(api_key=gemini_key)
        
        with open(audio_path, "rb") as af:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=af,
                response_format="verbose_json",
                timestamp_granularities=["word"]
            )
        print(f"✅ STT 완료: {len(transcript.words)} 단어")

        # 4. 자막 분할
        print("자막 분할 중...")
        segments = regroup_words_dynamic(transcript.words)
        print(f"✅ 분할 완료: {len(segments)} 세그먼트")

        # 5. 장르 분석
        print("장르 분석 중...")
        sample = " ".join([s["text"] for s in segments[:30]])
        guide_model = genai.GenerativeModel(GEMINI_MODEL)
        guide_res = guide_model.generate_content(
    f"""아래 대본 샘플 보고 딱 3줄로 요약해줘:

    1. 이 영상의 장르/종류는? (영화, 유튜브, 강의, 다큐, 게임 스트리밍, ASMR, 브이로그 등)
    2. 말하는 사람의 톤은? (반말/존댓말, 캐주얼/진지/감정적/차분/흥분 등)
    3. 한국어 번역할 때 어떤 말투로 해야 제일 자연스러울지 한 문장으로

    대본 샘플:
    {sample}

    형식:
    1. [장르]
    2. [톤]
    3. [추천 번역 스타일]"""
    )
        genre_guide = guide_res.text.strip()
        print(f"🎯 분석 결과: {genre_guide}")

        # 6. 번역
        print(f"번역 시작 ({len(segments)}개 세그먼트)")
        final_srt = []
        BATCH_SIZE = 100

        for i in range(0, len(segments), BATCH_SIZE):
            chunk = segments[i:i+BATCH_SIZE]
            translated = translate_batch_gemini(chunk, genre_guide)

            # 안전 매핑
            trans_map = {}
            for idx, item in enumerate(translated):
                orig_text = chunk[idx]["text"]
                ko_text = item.get("ko", orig_text + " (오류)")
                trans_map[item.get("id", idx)] = ko_text

            for idx, seg in enumerate(chunk):
                ko = trans_map.get(idx, seg["text"])
                start = format_timestamp(seg["start"])
                end = format_timestamp(seg["end"])
                num = i + idx + 1
                final_srt.append(f"{num}\n{start} --> {end}\n{ko}\n\n")

            print(f" → {min(i+BATCH_SIZE, len(segments))}/{len(segments)} 완료")

        # 7. SRT 저장
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write("".join(final_srt))
        print(f"✅ SRT 저장 완료: {srt_path}")

        # 8. 하드서브 (FFmpeg - 완벽 escaping 버전)
        print("하드서브 시작...")
        def escape_ffmpeg_path(path):
            s = str(path)
            s = s.replace("\\", "/")  # 슬래시로 통일
            s = s.replace(":", "\\:")  # 드라이브 콜론 escaping
            s = s.replace("'", "'\\''")  # 작은따옴표 escaping
            return s

        safe_srt_path = escape_ffmpeg_path(srt_path)
        print(f"[DEBUG] FFmpeg SRT 경로: {safe_srt_path}")

        style = "Fontname=Malgun Gothic,Fontsize=18,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=2,Shadow=1,MarginV=35"

        ffmpeg_cmd = [
            FFMPEG_CMD, "-y",
            "-i", str(file_path),
            "-vf", f"subtitles='{safe_srt_path}':force_style='{style}'",
            "-c:a", "copy",
            str(output_path)
        ]

        print(f"[FFmpeg 명령어]: {' '.join(ffmpeg_cmd)}")

        result = subprocess.run(
            ffmpeg_cmd,
            check=True,
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
        )
        print(f"✅ 하드서브 완료! FFmpeg 출력: {result.stdout[:200]}...")

        print("🎉 모든 작업 완료! 파일 전송")
        return FileResponse(output_path, media_type="video/mp4", filename="walnut_subtitled.mp4")

    except HTTPException:
        raise  # 이미 HTTPException이면 그대로 뱉기
    except Exception as e:
        import traceback
        print(f"❌ [CRITICAL ERROR] {e}")
        traceback.print_exc()
        # 임시 파일들 삭제 (정리)
        for path in [file_path, audio_path, srt_path, output_path]:
            if path.exists():
                path.unlink()
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")
    
    # === 새로운 엔드포인트: 텍스트만 추출 (30 호두) ===
@app.post("/upload/text")
async def extract_text(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_path = upload_dir / f"{file_id}_audio"
    
    # 지원 확장자 (mp4, mp3, wav, m4a 등)
    allowed = ["mp4", "mp3", "wav", "m4a", "webm", "ogg"]
    ext = file.filename.lower().split(".")[-1]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식입니다.")

    try:
        # 파일 저장
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        print("텍스트 추출 시작... (Whisper 자동 언어 감지)")

        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        with open(file_path, "rb") as af:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=af,
                response_format="verbose_json",           # ← 이거 있으면 언어 감지 + 세그먼트 줌
                timestamp_granularities=["word"]          # ← 단어별 타임스탬프 (필수는 아님)
            )

        # 언어 감지 결과 (Whisper가 자동으로 알려줌!)
        detected_lang = transcript.language
        full_text = transcript.text.strip()

        print(f"감지된 언어: {detected_lang.upper()}")
        print(f"텍스트 길이: {len(full_text)}자")

        # 결과 JSON으로 뱉기 (프론트에서 바로 보여줄 수 있게)
        result = {
            "language": detected_lang,
            "text": full_text,
            "segments": [
                {
                    "start": seg.start,
                    "end": seg.end,
                    "text": seg.text
                } for seg in transcript.segments
            ] if hasattr(transcript, "segments") else []
        }

        # 임시 파일 정리
        if file_path.exists():
            file_path.unlink()

        return result

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"텍스트 추출 실패: {str(e)}")