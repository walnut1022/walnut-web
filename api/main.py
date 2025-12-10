from fastapi import FastAPI, UploadFile, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from faster_whisper import WhisperModel
import os
import ffmpeg
# 🚀 [수정됨] googletrans 대신 deep_translator를 사용합니다
from deep_translator import GoogleTranslator 
import datetime
import shutil

app = FastAPI()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🧠 모델 설정 (large-v3가 가장 똑똑함, 너무 느리면 medium으로 변경)
MODEL_SIZE = "large-v3"

print(f"🧠 AI 두뇌 로딩 중... ({MODEL_SIZE})")
try:
    # GPU 확인
    model = WhisperModel(MODEL_SIZE, device="cuda", compute_type="float16")
    print(f"✅ GPU 가속 활성화! ({MODEL_SIZE})")
except:
    # GPU 없으면 CPU
    model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    print(f"⚠️ GPU 없음. CPU 모드로 실행합니다.")

def format_timestamp(seconds):
    """자막 시간 포맷 변환 (00:00:00,000)"""
    td = datetime.timedelta(seconds=seconds)
    total_seconds = int(td.total_seconds())
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    secs = total_seconds % 60
    millis = int(td.microseconds / 1000)
    return f"{hours:02}:{minutes:02}:{secs:02},{millis:03}"

@app.post("/transcribe")
async def transcribe_video(file: UploadFile = File(...)):
    filename = file.filename
    input_path = f"temp_{filename}"
    output_video_path = f"output_{filename}"
    srt_path = "subtitles.srt"

    try:
        # 1. 파일 저장
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        print(f"🎬 [1/3] 음성 인식 시작...")
        
        # 2. Whisper로 음성 인식 (VAD 필터 켜기)
        segments, info = model.transcribe(
            input_path, 
            beam_size=5, 
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        print(f"🌍 감지된 언어: {info.language}")
        print("📝 [2/3] 번역 및 자막 생성 중...")
        
        # 🚀 [수정됨] 딥러닝 번역기 초기화
        translator = GoogleTranslator(source='auto', target='ko')

        with open(srt_path, "w", encoding="utf-8") as srt_file:
            for i, segment in enumerate(segments):
                start = format_timestamp(segment.start)
                end = format_timestamp(segment.end)
                original_text = segment.text.strip()
                
                if len(original_text) < 2: continue

                try:
                    # 한국어가 아닐 때만 번역
                    if info.language != 'ko':
                        translated = translator.translate(original_text)
                    else:
                        translated = original_text
                except Exception as e:
                    print(f"번역 에러(무시됨): {e}")
                    translated = original_text 

                # 로그 출력
                print(f"[{start}] {original_text} -> {translated}")

                srt_file.write(f"{i+1}\n")
                srt_file.write(f"{start} --> {end}\n")
                srt_file.write(f"{translated}\n\n")

        print("🔥 [3/3] 자막 합성 중...")
        
        # 3. FFmpeg로 자막 입히기
        try:
            input_ffmpeg = ffmpeg.input(input_path)
            audio_ffmpeg = input_ffmpeg.audio
            
            # 자막 스타일 설정 (맑은고딕, 20pt, 흰색글씨)
            video_ffmpeg = input_ffmpeg.video.filter(
                'subtitles', 
                srt_path, 
                force_style='FontName=Malgun Gothic,FontSize=20,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,BorderStyle=1,Outline=1,Shadow=0,MarginV=25'
            )

            out = ffmpeg.output(
                video_ffmpeg, 
                audio_ffmpeg, 
                output_video_path, 
                vcodec='libx264', 
                preset='medium',
                crf=23,
                acodec='aac'
            )
            out.run(overwrite_output=True, quiet=True)
            
            print("✅ 완료! 다운로드 시작")
            return FileResponse(output_video_path, filename=f"walnut_HQ_{filename}")

        except ffmpeg.Error as e:
            print("FFmpeg 에러:", e)
            return {"error": "자막 합성 실패 (FFmpeg 설치 확인 필요)"}

    except Exception as e:
        print(f"❌ 에러: {e}")
        return {"error": str(e)}
        
    finally:
        # 임시 파일 삭제
        if os.path.exists(input_path): os.remove(input_path)
        if os.path.exists(srt_path): os.remove(srt_path)