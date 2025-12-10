import os
from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

# 내 키 가져오기
my_key = os.environ.get("ANTHROPIC_API_KEY")

print("---------------------------------------")
if not my_key:
    print("❌ .env에서 키를 못 찾았습니다.")
else:
    print("✅ 키를 찾았습니다. 사용 가능한 모델을 조회합니다...")
    
    try:
        client = Anthropic(api_key=my_key)
        # 내 키로 쓸 수 있는 모델 리스트 요청
        models = client.models.list()
        
        print("\n[내 키로 지금 당장 쓸 수 있는 모델 목록]")
        available_models = []
        for m in models.data:
            print(f"- {m.id}")
            available_models.append(m.id)
            
        print("\n---------------------------------------")
        if "claude-3-5-sonnet-20241022" in available_models:
            print("🎉 최신 모델(20241022) 사용 가능합니다! 오타였을 수 있습니다.")
        elif "claude-3-5-sonnet-20240620" in available_models:
            print("👍 6월 버전(20240620)은 사용 가능합니다.")
        else:
            print("⚠️ Sonnet 사용 불가. 위 목록에 있는 모델 중 하나를 골라 main.py에 적어야 합니다.")
            
    except Exception as e:
        print(f"❌ 조회 실패: {e}")
        print("이러면 계정에 돈(Credit)이 충전 안 됐거나, 키가 잘못된 것입니다.")