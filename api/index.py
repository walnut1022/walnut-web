from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import yt_dlp
import math
import whisper
import os
import torch
import subprocess # FFmpeg 명령어 실행용

app = FastAPI()

# 1. 보안 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. 가상 DB (지갑)
fake_db = {"balance": 500}

# 3. AI 모델 로딩 (서버 켤 때 한 번만!)
print("------------------------------------------------")
print("🚀 AI 모델 로딩 중... (그래픽카드 예열 시작)")
# GPU(cuda)가 있으면 쓰고, 없으면 CPU를 씁니다.
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 사용 장치: {device} (RTX 4070Ti 성능을 보여줘!)")

# 모델 크기 설정: 'medium' 추천 (속도와 성능의 균형)
# 더 정확하게 하고 싶으면 'large-v3'로 바꾸세요 (메모리 충분함)
model = whisper.load_model("medium", device=device)
print("✅ 모델 로딩 완료! 준비 끝.")
print("------------------------------------------------")

class VideoRequest(BaseModel):
    url: str

class PaymentRequest(BaseModel):
    cost: int
    url: str

# [보조 함수] 시간 포맷 변환 (00:00:00,000)
def format_timestamp(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds - int(seconds)) * 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

# [핵심 함수] 다운로드 -> AI 분석 -> 자막 굽기
def process_video_task(url: str):
    try:
        print(f"🎬 [작업 시작] URL: {url}")
        
        # 파일명 정의
        video_input = "input.mp4"
        audio_input = "input.mp3" # Whisper용 오디오
        srt_output = "subtitle.srt"
        video_output = "final_output.mp4"

        # 기존 파일 청소
        for f in [video_input, audio_input, srt_output, video_output]:
            if os.path.exists(f): os.remove(f)

        # 1. 영상 다운로드 (yt-dlp)
        print("⬇️ 영상 다운로드 중...")
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'outtmpl': 'input.%(ext)s',
            'quiet': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        # 2. 오디오 추출 (FFmpeg) - Whisper는 오디오만 있으면 됨
        print("🎵 오디오 추출 중...")
        subprocess.run(f'ffmpeg -i {video_input} -vn -acodec libmp3lame -q:a 4 {audio_input} -y', shell=True, check=True)

        # 3. AI 자막 생성 (Whisper)
        print("🤖 AI 자막 생성 중 (Whisper)...")
        # task="transcribe"는 원래 언어 그대로 받아쓰기
        # task="translate"는 영어로 번역하기 (일본어->한국어는 바로 안됨. 일단 transcribe로 진행!)
        result = model.transcribe(audio_input)

        # SRT 파일 만들기
        with open(srt_output, "w", encoding="utf-8") as f:
            for i, segment in enumerate(result["segments"]):
                start = format_timestamp(segment["start"])
                end = format_timestamp(segment["end"])
                text = segment["text"]
                f.write(f"{i+1}\n{start} --> {end}\n{text}\n\n")
        
        # 4. 자막 영상에 박기 (Hardsub)
        print("🔥 자막 굽는 중 (Burning)...")
        # 윈도우 폰트 설정 (맑은 고딕)
        font_style = "FontName=Malgun Gothic,FontSize=16,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=1,Shadow=0"
        
        # FFmpeg 명령어로 자막 합성
        # 경로 문제 방지를 위해 절대 경로 사용 추천하나, 일단 상대 경로로 시도
        cmd = f'ffmpeg -i {video_input} -vf "subtitles={srt_output}:force_style=\'{font_style}\'" -c:a copy {video_output} -y'
        subprocess.run(cmd, shell=True, check=True)
        
        print(f"✨ 모든 작업 완료! 결과물: {video_output}")

    except Exception as e:
        print(f"❌ 에러 발생: {str(e)}")

# [API] 견적 조회
@app.post("/get-info")
def get_video_info(req: VideoRequest):
    ydl_opts = {'quiet': True}
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(req.url, download=False)
        duration = info.get('duration', 0)
        title = info.get('title', '제목 없음')
        cost = math.ceil(duration / 60) * 10
        return {"status": "success", "title": title, "duration_sec": duration, "cost": cost}

# [API] 결제 및 작업 시작
@app.post("/pay")
async def pay_walnut(req: PaymentRequest, background_tasks: BackgroundTasks):
    global fake_db
    
    if fake_db["balance"] < req.cost:
        return {"status": "fail", "message": "잔액 부족!"}
    
    fake_db["balance"] -= req.cost
    
    # ★ 백그라운드에서 작업 시작 (사용자는 기다리지 않음)
    background_tasks.add_task(process_video_task, req.url)
    
    return {
        "status": "success", 
        "new_balance": fake_db["balance"],
        "message": "결제 성공! AI가 자막 제작을 시작했습니다. (터미널 확인)"
    }

# [API] 결과물 다운로드
@app.get("/download")
def download_file():
    if os.path.exists("final_output.mp4"):
        return FileResponse("final_output.mp4", media_type="video/mp4", filename="walnut_video.mp4")
    return {"error": "아직 파일이 없습니다. 조금만 더 기다려주세요!"}