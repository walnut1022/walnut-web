import os
import shutil
import subprocess
import math
import uuid
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv  # 👈 이 임포트가 빠져있어서 추가했습니다
from openai import OpenAI
from anthropic import Anthropic 

print("================ 점검 시작 ================")
openai_key = os.environ.get("OPENAI_API_KEY")
claude_key = os.environ.get("ANTHROPIC_API_KEY")

print(f"1. OpenAI 키 상태: {'✅ 성공' if openai_key else '❌ 실패 (None)'}")
if openai_key: print(f"   ㄴ 앞자리 확인: {openai_key[:5]}...")

print(f"2. Claude 키 상태: {'✅ 성공' if claude_key else '❌ 실패 (None)'}")
if claude_key: print(f"   ㄴ 앞자리 확인: {claude_key[:10]}...")
print("================ 점검 끝 ================")
# 1. 환경 변수 로드 (.env 파일 읽기)
load_dotenv()

app = FastAPI()

# 2. CORS 설정 (프론트엔드 통신 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. 업로드 폴더 생성
UPLOAD_DIR = "temp_uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# 4. 모델 설정 (Claude 3.5 Sonnet)
CLAUDE_MODEL = "claude-3-5-sonnet-20240620"

# 타임스탬프 포맷 함수
def format_timestamp(seconds):
    hours = math.floor(seconds / 3600)
    seconds %= 3600
    minutes = math.floor(seconds / 60)
    seconds %= 60
    return f"{hours:02d}:{minutes:02d}:{int(seconds):02d},{int((seconds % 1) * 1000):03d}"

@app.post("/upload/video")
async def upload_video(file: UploadFile = File(...)):
    try:
        # [수정됨] 하드코딩된 키 삭제함. 무조건 .env나 환경변수에서 가져옵니다.
        openai_api_key = os.environ.get("OPENAI_API_KEY")
        anthropic_api_key = os.environ.get("ANTHROPIC_API_KEY")

        if not openai_api_key or not anthropic_api_key:
            raise HTTPException(status_code=500, detail="API Key가 .env 파일에 없습니다.")

        # 클라이언트 초기화
        openai_client = OpenAI(api_key=openai_api_key)
        anthropic_client = Anthropic(api_key=anthropic_api_key)

        # [1] 파일 저장
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.mp4"
        file_path = os.path.join(UPLOAD_DIR, filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        abs_input_path = os.path.abspath(file_path)
        abs_audio_path = os.path.abspath(file_path.replace(".mp4", ".mp3"))
        
        # FFmpeg로 오디오 추출
        subprocess.run([
            'ffmpeg', '-y', '-i', abs_input_path, '-vn', '-acodec', 'libmp3lame', abs_audio_path
        ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        # [2] 듣기 담당: OpenAI Whisper
        print("👂 1. OpenAI가 영상을 듣고 받아쓰는 중...")
        with open(abs_audio_path, "rb") as audio_file:
            transcript = openai_client.audio.transcriptions.create(
                model="whisper-1", 
                file=audio_file,
                response_format="verbose_json"
            )

        full_text = transcript.text
        sample_text = full_text[:1000] 

        # [3] 감독 담당: Claude (분위기 분석)
        print(f"🧠 2. Claude({CLAUDE_MODEL})가 영상 분위기를 정밀 분석합니다...")
        
        director_response = anthropic_client.messages.create(
            model=CLAUDE_MODEL, 
            max_tokens=1000,
            temperature=0, # 분석은 정확해야 하므로 0 추천
            system="""
            너는 세계 최고의 '영상 번역 디렉터'야. 
            주어진 스크립트의 [장르, 화자의 성격, 상황, 타겟 시청자]를 완벽하게 분석해.
            그리고 그 분석을 바탕으로, 번역가가 따라야 할 '구체적인 번역 지침(System Prompt)'을 작성해줘.
            
            결과는 군더더기 없이 오직 '지침(System Prompt)' 내용만 출력해.
            """,
            messages=[
                {"role": "user", "content": f"분석할 스크립트 샘플:\n{sample_text}"}
            ]
        )
        
        # 응답 처리 (text 타입 확인)
        custom_system_prompt = ""
        if director_response.content and director_response.content[0].type == 'text':
             custom_system_prompt = director_response.content[0].text
        else:
             custom_system_prompt = "자연스러운 한국어로 번역해줘."

        print(f"🎯 Claude의 분석 결과:\n{custom_system_prompt}\n----------------")

        # [4] 번역 담당: Claude (실전 번역 - 루프)
        srt_content = ""
        print("🇰🇷 3. Claude가 감칠맛 나게 번역 중...")
        
        segments = transcript.segments
        
        for i, segment in enumerate(segments): 
            start = format_timestamp(segment.start) 
            end = format_timestamp(segment.end)
            text = segment.text

            # Claude에게 번역 요청
            trans_res = anthropic_client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=300,
                temperature=0,
                system=custom_system_prompt, 
                messages=[
                    {"role": "user", "content": f"Translate this subtitle to Korean naturally: {text}"}
                ]
            )
            
            kor_text = trans_res.content[0].text
            srt_content += f"{i+1}\n{start} --> {end}\n{kor_text}\n\n"
            
            # 진행 상황 로그 (선택 사항)
            print(f"[{i+1}/{len(segments)}] 번역 완료")

        # SRT 파일 저장
        srt_path = os.path.join(UPLOAD_DIR, f"{file_id}.srt")
        with open(srt_path, "w", encoding="utf-8") as f:
            f.write(srt_content)

        # [5] 자막 합성 (FFmpeg)
        output_video_path = os.path.join(UPLOAD_DIR, f"subtitled_{file_id}.mp4")
        
        # 윈도우 경로 문제 해결을 위한 이스케이프 처리
        # 드라이브 문자 뒤의 콜론(:)을 이스케이프하고 역슬래시를 슬래시로 변경
        abs_srt_path = os.path.abspath(srt_path).replace("\\", "/").replace(":", "\\\\:")
        
        print("🎬 4. 자막 합성 중...")
        # 폰트 스타일 지정 (맑은 고딕 등 한글 폰트 추천)
        style = "Fontname=Malgun Gothic,Fontsize=20,PrimaryColour=&H00FFFF&,OutlineColour=&H000000&,BorderStyle=1,Outline=1,Shadow=0,MarginV=20"
        
        subprocess.run([
            'ffmpeg', '-y', 
            '-i', abs_input_path, 
            '-vf', f"subtitles='{abs_srt_path}':force_style='{style}'", 
            '-c:a', 'copy', 
            output_video_path
        ], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        print("✅ 모든 작업 완료! 파일 전송 시작")
        
        return FileResponse(output_video_path, media_type="video/mp4", filename="walnut_output.mp4")

    except Exception as e:
        print(f"❌ 에러 발생: {e}")
        # 에러 내용을 그대로 클라이언트에 전달 (디버깅용)
        raise HTTPException(status_code=500, detail=str(e))