import os
from dotenv import load_dotenv
from anthropic import Anthropic

# .env 로드
load_dotenv()

key = os.environ.get("ANTHROPIC_API_KEY")
print(f"🔑 현재 키: {key[:10]}...")

try:
    client = Anthropic(api_key=key)
    print("📡 사용 가능한 모델 목록 조회 중...")
    models = client.models.list()
    
    print("\n[내 키로 쓸 수 있는 모델들]")
    for m in models.data:
        print(f"- {m.id}")

except Exception as e:
    print(f"\n❌ 에러 발생: {e}")
    print("계정 결제 상태나 키 값을 다시 확인해야 합니다.")