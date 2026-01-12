#!/usr/bin/env python3
"""
Confluence 연결 테스트 스크립트
API 연결 및 스페이스 정보를 확인합니다.
"""

import os
import requests
import base64

BASE_URL = "https://krafton.atlassian.net"

def get_auth_headers():
    email = os.environ.get('CONFLUENCE_EMAIL')
    api_token = os.environ.get('CONFLUENCE_API_TOKEN')
    
    if not email or not api_token:
        print("❌ 환경 변수가 설정되지 않았습니다.")
        print("   $env:CONFLUENCE_EMAIL = 'your-email@krafton.com'")
        print("   $env:CONFLUENCE_API_TOKEN = 'your-api-token'")
        return None
    
    print(f"✅ 이메일: {email}")
    print(f"✅ API 토큰: {'*' * 10}...{api_token[-4:]}")
    
    credentials = base64.b64encode(f"{email}:{api_token}".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

def test_connection():
    print("\n" + "="*50)
    print("Confluence 연결 테스트")
    print("="*50 + "\n")
    
    headers = get_auth_headers()
    if not headers:
        return
    
    # 1. 스페이스 목록 가져오기 (권한 테스트)
    print("\n📌 1. 스페이스 목록 접근 테스트...")
    try:
        url = f"{BASE_URL}/wiki/rest/api/space"
        params = {"limit": 50}
        response = requests.get(url, headers=headers, params=params)
        print(f"   상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            spaces = response.json().get('results', [])
            print(f"   ✅ 성공! {len(spaces)}개 스페이스 발견\n")
            
            for space in spaces:
                key = space.get('key', '')
                name = space.get('name', '')
                if 'AEGIS' in key.upper() or 'AEGIS' in name.upper():
                    print(f"   ⭐ Key: {key:20} | Name: {name}")
                else:
                    print(f"      Key: {key:20} | Name: {name}")
        elif response.status_code == 403:
            print("   ❌ 403 Forbidden - API 접근 권한이 없습니다.")
            print("\n   가능한 원인:")
            print("   1. 조직에서 API 토큰 접근을 제한함")
            print("   2. Atlassian Access (SSO)가 활성화되어 있음")
            print("   3. IP 제한이 설정되어 있음")
            print("\n   해결 방법:")
            print("   → IT 관리자에게 API 접근 권한 요청")
            print("   → 또는 OAuth 2.0 앱 등록 필요")
        else:
            print(f"   ❌ 오류: {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ 오류: {e}")
    
    # 2. 직접 콘텐츠 검색 시도
    print("\n📌 2. 콘텐츠 검색 API 테스트...")
    try:
        url = f"{BASE_URL}/wiki/rest/api/content/search"
        params = {"cql": "type=page", "limit": 5}
        response = requests.get(url, headers=headers, params=params)
        print(f"   상태 코드: {response.status_code}")
        
        if response.status_code == 200:
            results = response.json().get('results', [])
            print(f"   ✅ 성공! {len(results)}개 페이지 발견")
            for page in results[:5]:
                print(f"      - {page.get('title', 'Unknown')}")
        elif response.status_code == 403:
            print("   ❌ 403 Forbidden")
        else:
            print(f"   ❌ {response.text[:200]}")
            
    except Exception as e:
        print(f"   ❌ 오류: {e}")
    
    # 3. 특정 페이지 ID로 접근 시도 (단축 URL에서 추출)
    print("\n📌 3. 페이지 직접 접근 테스트...")
    # v47tKw는 base64 인코딩된 페이지 ID일 수 있음
    print("   단축 URL: https://krafton.atlassian.net/wiki/x/v47tKw")
    
    # 단축 URL 디코딩 시도
    try:
        import base64
        short_code = "v47tKw"
        # Confluence 단축 URL은 특수한 인코딩 사용
        # 패딩 추가
        padded = short_code + "=" * (4 - len(short_code) % 4)
        try:
            decoded = base64.urlsafe_b64decode(padded)
            page_id = int.from_bytes(decoded, 'big')
            print(f"   디코딩된 페이지 ID: {page_id}")
            
            # 해당 페이지 접근 시도
            url = f"{BASE_URL}/wiki/rest/api/content/{page_id}"
            response = requests.get(url, headers=headers)
            print(f"   상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                page = response.json()
                print(f"   ✅ 페이지 발견!")
                print(f"      제목: {page.get('title')}")
                print(f"      스페이스: {page.get('space', {}).get('key')}")
            else:
                print(f"   ❌ {response.status_code}")
        except:
            print("   디코딩 실패, 다른 형식일 수 있음")
    except Exception as e:
        print(f"   ❌ 오류: {e}")
    
    # 4. 대안 제시
    print("\n" + "="*50)
    print("📋 대안 방법")
    print("="*50)
    print("""
API 접근이 제한된 경우, 다음 대안을 고려하세요:

1. **수동 내보내기 방식**
   - Confluence에서 스페이스를 PDF/Word로 내보내기
   - 내보낸 파일을 data/references/ 폴더에 저장
   - Claude가 해당 파일을 참조

2. **브라우저 확장 프로그램**
   - Confluence 페이지를 마크다운으로 복사
   - cache/ 폴더에 수동으로 저장

3. **IT 관리자에게 요청**
   - API 토큰 접근 권한 활성화 요청
   - 또는 OAuth 2.0 앱 등록 요청

4. **Confluence 앱 사용**
   - Atlassian Marketplace에서 Export 앱 설치
   - 스페이스 전체를 마크다운으로 내보내기
""")

if __name__ == "__main__":
    test_connection()
