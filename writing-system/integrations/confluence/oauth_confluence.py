#!/usr/bin/env python3
"""
Confluence OAuth 2.0 연동 스크립트

사용법:
    1. 환경 변수 설정:
       $env:CONFLUENCE_CLIENT_ID = "your-client-id"
       $env:CONFLUENCE_CLIENT_SECRET = "your-client-secret"
    
    2. 인증 실행:
       python oauth_confluence.py --auth
    
    3. 문서 동기화:
       python oauth_confluence.py --sync
"""

import os
import json
import webbrowser
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, parse_qs, urlparse
from pathlib import Path
from datetime import datetime
import base64

# 설정
CONFIG_PATH = Path(__file__).parent / "oauth_config.json"
TOKEN_PATH = Path(__file__).parent / "oauth_token.json"
CACHE_DIR = Path(__file__).parent / "cache"
INDEX_FILE = CACHE_DIR / "page_index.json"

# Atlassian OAuth 2.0 엔드포인트
AUTH_URL = "https://auth.atlassian.com/authorize"
TOKEN_URL = "https://auth.atlassian.com/oauth/token"
API_URL = "https://api.atlassian.com"

# 콜백 서버 설정
CALLBACK_HOST = "localhost"
CALLBACK_PORT = 8080
REDIRECT_URI = f"http://{CALLBACK_HOST}:{CALLBACK_PORT}/callback"

# 필요한 권한 (Classic + Granular scopes)
SCOPES = [
    # Classic scopes
    "read:confluence-space.summary",
    "read:confluence-props",
    "read:confluence-content.all",
    "read:confluence-content.summary",
    "search:confluence",
    "read:confluence-user",
    "read:confluence-groups",
    "readonly:content.attachment:confluence",
    # Granular scopes (API v2용)
    "read:space:confluence",
    "read:page:confluence",
    "read:content:confluence",
    "read:content-details:confluence",
    # Refresh token
    "offline_access"
]


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """OAuth 콜백을 처리하는 HTTP 핸들러"""
    
    authorization_code = None
    
    def do_GET(self):
        """GET 요청 처리"""
        parsed = urlparse(self.path)
        
        if parsed.path == "/callback":
            query = parse_qs(parsed.query)
            
            if "code" in query:
                OAuthCallbackHandler.authorization_code = query["code"][0]
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"""
                <html>
                <head><title>Authorization Successful</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>&#10004; Authorization Successful!</h1>
                    <p>You can close this window and return to the terminal.</p>
                </body>
                </html>
                """)
            else:
                error = query.get("error", ["Unknown error"])[0]
                self.send_response(400)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"""
                <html>
                <head><title>Authorization Failed</title></head>
                <body style="font-family: sans-serif; text-align: center; padding: 50px;">
                    <h1>&#10008; Authorization Failed</h1>
                    <p>Error: {error}</p>
                </body>
                </html>
                """.encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        """로그 메시지 숨기기"""
        pass


class ConfluenceOAuth:
    """Confluence OAuth 2.0 클라이언트"""
    
    def __init__(self):
        self.client_id = os.environ.get("CONFLUENCE_CLIENT_ID")
        self.client_secret = os.environ.get("CONFLUENCE_CLIENT_SECRET")
        
        if not self.client_id or not self.client_secret:
            raise ValueError(
                "환경 변수를 설정해주세요:\n"
                "  $env:CONFLUENCE_CLIENT_ID = 'your-client-id'\n"
                "  $env:CONFLUENCE_CLIENT_SECRET = 'your-client-secret'\n\n"
                "OAuth 앱 생성: https://developer.atlassian.com/console/myapps/"
            )
        
        self.token = self._load_token()
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    def _load_token(self):
        """저장된 토큰 로드"""
        if TOKEN_PATH.exists():
            with open(TOKEN_PATH, 'r') as f:
                return json.load(f)
        return None
    
    def _save_token(self, token):
        """토큰 저장"""
        with open(TOKEN_PATH, 'w') as f:
            json.dump(token, f, indent=2)
        self.token = token
    
    def authorize(self):
        """OAuth 인증 플로우 실행"""
        print("\n" + "="*50)
        print("Confluence OAuth 2.0 Authentication")
        print("="*50 + "\n")
        
        # 1. Authorization URL 생성
        params = {
            "audience": "api.atlassian.com",
            "client_id": self.client_id,
            "scope": " ".join(SCOPES),
            "redirect_uri": REDIRECT_URI,
            "response_type": "code",
            "prompt": "consent"
        }
        auth_url = f"{AUTH_URL}?{urlencode(params)}"
        
        print("[*] Opening Atlassian login page in browser...")
        print("    Please login and approve the permissions.\n")
        
        # 2. 브라우저 열기
        webbrowser.open(auth_url)
        
        # 3. 콜백 서버 시작
        print(f"[*] Waiting for callback... (http://{CALLBACK_HOST}:{CALLBACK_PORT})")
        
        server = HTTPServer((CALLBACK_HOST, CALLBACK_PORT), OAuthCallbackHandler)
        server.handle_request()  # 한 번만 처리
        
        if not OAuthCallbackHandler.authorization_code:
            print("\n[ERROR] Authentication failed: No authorization code received.")
            return False
        
        # 4. Access Token 교환
        print("\n[*] Requesting Access Token...")
        
        token_data = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": OAuthCallbackHandler.authorization_code,
            "redirect_uri": REDIRECT_URI
        }
        
        response = requests.post(TOKEN_URL, data=token_data)
        
        if response.status_code != 200:
            print(f"\n[ERROR] Token request failed: {response.text}")
            return False
        
        token = response.json()
        token["obtained_at"] = datetime.now().isoformat()
        self._save_token(token)
        
        print("\n[OK] Authentication successful! Token saved.")
        print(f"     Token file: {TOKEN_PATH}")
        
        # 5. 접근 가능한 사이트 확인
        self._get_accessible_sites()
        
        return True
    
    def _get_accessible_sites(self):
        """접근 가능한 Atlassian 사이트 목록"""
        print("\n[*] Checking accessible sites...")
        
        headers = {"Authorization": f"Bearer {self.token['access_token']}"}
        response = requests.get(
            f"{API_URL}/oauth/token/accessible-resources",
            headers=headers
        )
        
        if response.status_code == 200:
            sites = response.json()
            print(f"\n    {len(sites)} site(s) accessible:\n")
            
            for site in sites:
                print(f"    - {site['name']}")
                print(f"      URL: {site['url']}")
                print(f"      Cloud ID: {site['id']}")
            
            # 첫 번째 사이트의 Cloud ID 저장
            if sites:
                config = {"cloud_id": sites[0]["id"], "site_url": sites[0]["url"]}
                with open(CONFIG_PATH, 'w') as f:
                    json.dump(config, f, indent=2)
                print(f"\n    [OK] Cloud ID saved: {sites[0]['id']}")
        else:
            print(f"    [ERROR] Failed to get site list: {response.status_code}")
    
    def refresh_token(self):
        """토큰 갱신"""
        if not self.token or "refresh_token" not in self.token:
            print("[ERROR] No refresh token. Please run --auth again.")
            return False
        
        token_data = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.token["refresh_token"]
        }
        
        response = requests.post(TOKEN_URL, data=token_data)
        
        if response.status_code == 200:
            new_token = response.json()
            new_token["obtained_at"] = datetime.now().isoformat()
            # refresh_token이 없으면 기존 것 유지
            if "refresh_token" not in new_token:
                new_token["refresh_token"] = self.token["refresh_token"]
            self._save_token(new_token)
            print("[OK] Token refreshed successfully")
            return True
        else:
            print(f"[ERROR] Token refresh failed: {response.text}")
            return False
    
    def get_headers(self):
        """API 요청용 헤더"""
        if not self.token:
            raise ValueError("토큰이 없습니다. --auth로 먼저 인증하세요.")
        return {
            "Authorization": f"Bearer {self.token['access_token']}",
            "Accept": "application/json"
        }
    
    def get_cloud_id(self):
        """저장된 Cloud ID 가져오기"""
        if CONFIG_PATH.exists():
            with open(CONFIG_PATH, 'r') as f:
                config = json.load(f)
                return config.get("cloud_id")
        return None
    
    def list_spaces(self):
        """접근 가능한 모든 스페이스 목록 조회"""
        cloud_id = self.get_cloud_id()
        if not cloud_id:
            print("[ERROR] No Cloud ID. Please run --auth first.")
            return []
        
        print("\n[*] Fetching all spaces...")
        print(f"[*] Cloud ID: {cloud_id}")
        
        # 여러 API 엔드포인트 시도
        endpoints = [
            f"{API_URL}/ex/confluence/{cloud_id}/wiki/api/v2/spaces",
            f"{API_URL}/ex/confluence/{cloud_id}/rest/api/space",
            f"https://krafton.atlassian.net/wiki/api/v2/spaces",
        ]
        
        for endpoint in endpoints:
            print(f"[*] Trying: {endpoint}")
            
            params = {"limit": 100}
            response = requests.get(endpoint, headers=self.get_headers(), params=params)
            
            print(f"    Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                print(f"\n[OK] Found {len(results)} spaces:\n")
                
                for space in results:
                    space_id = space.get("id")
                    space_key = space.get("key")
                    space_name = space.get("name")
                    
                    if space_key and space_name:
                        if "AEGIS" in space_key.upper() or "AEGIS" in space_name.upper():
                            print(f"  ** Key: {space_key:20} | Name: {space_name} | ID: {space_id}")
                        else:
                            print(f"     Key: {space_key:20} | Name: {space_name}")
                
                return results
            elif response.status_code == 401:
                print("    [WARN] Token expired, refreshing...")
                self.refresh_token()
            else:
                print(f"    Response: {response.text[:200]}")
        
        print("\n[ERROR] All endpoints failed.")
        return []
    
    def find_space(self, keyword):
        """키워드로 스페이스 검색 (모든 스페이스에서)"""
        cloud_id = self.get_cloud_id()
        if not cloud_id:
            print("[ERROR] No Cloud ID. Please run --auth first.")
            return []
        
        print(f"\n[*] Searching for spaces containing '{keyword}'...")
        
        # list_spaces와 동일한 엔드포인트 사용 (성공했던 것)
        base_url = f"{API_URL}/ex/confluence/{cloud_id}/wiki/api/v2/spaces"
        
        all_spaces = []
        cursor = None
        page = 1
        
        while True:
            params = {"limit": 250}
            if cursor:
                params["cursor"] = cursor
            
            print(f"    Fetching page {page}...")
            response = requests.get(base_url, headers=self.get_headers(), params=params)
            
            if response.status_code == 401:
                print("    [WARN] Token expired, refreshing...")
                self.refresh_token()
                response = requests.get(base_url, headers=self.get_headers(), params=params)
            
            if response.status_code != 200:
                print(f"[ERROR] {response.status_code} - {response.text[:200]}")
                break
            
            data = response.json()
            results = data.get("results", [])
            all_spaces.extend(results)
            
            print(f"    Total fetched: {len(all_spaces)} spaces")
            
            # 다음 페이지 (cursor 기반)
            links = data.get("_links", {})
            next_link = links.get("next")
            if next_link and "cursor=" in next_link:
                cursor = next_link.split("cursor=")[1].split("&")[0]
                page += 1
            else:
                break
        
        print(f"\n[*] Total spaces found: {len(all_spaces)}")
        
        # 키워드로 필터링
        keyword_lower = keyword.lower()
        matches = []
        
        for space in all_spaces:
            space_key = space.get("key", "")
            space_name = space.get("name", "")
            space_id = space.get("id", "")
            
            if keyword_lower in space_key.lower() or keyword_lower in space_name.lower():
                matches.append(space)
                print(f"  ** Key: {space_key:25} | Name: {space_name} | ID: {space_id}")
        
        if not matches:
            print(f"\n[!] No spaces found matching '{keyword}'")
            print("\n[*] Showing first 30 spaces for reference:")
            for space in all_spaces[:30]:
                print(f"    Key: {space.get('key', ''):25} | Name: {space.get('name', '')}")
            if len(all_spaces) > 30:
                print(f"    ... and {len(all_spaces) - 30} more")
        else:
            print(f"\n[OK] Found {len(matches)} matching space(s)")
        
        return matches
    
    def get_all_pages(self, space_key="AEGIS", limit=250):
        """스페이스의 모든 페이지 가져오기 (API v2)"""
        cloud_id = self.get_cloud_id()
        if not cloud_id:
            print("[ERROR] No Cloud ID. Please run --auth first.")
            return []
        
        # 먼저 space_key로 space_id 찾기
        space_id = self._get_space_id(space_key)
        if not space_id:
            print(f"[ERROR] Space '{space_key}' not found.")
            return []
        
        print(f"[*] Space ID: {space_id}")
        
        # API v2 엔드포인트 사용 (find_space와 동일한 base)
        base_url = f"{API_URL}/ex/confluence/{cloud_id}/wiki/api/v2"
        url = f"{base_url}/spaces/{space_id}/pages"
        
        all_pages = []
        cursor = None
        page_num = 1
        
        while True:
            params = {"limit": limit}
            if cursor:
                params["cursor"] = cursor
            
            print(f"    Fetching page {page_num}...")
            response = requests.get(url, headers=self.get_headers(), params=params)
            
            if response.status_code == 401:
                print("[WARN] Token expired, refreshing...")
                if self.refresh_token():
                    response = requests.get(url, headers=self.get_headers(), params=params)
                else:
                    return []
            
            if response.status_code != 200:
                print(f"[ERROR] API error: {response.status_code} - {response.text[:300]}")
                return all_pages
            
            data = response.json()
            results = data.get("results", [])
            all_pages.extend(results)
            
            print(f"    Total fetched: {len(all_pages)} pages")
            
            # 다음 페이지 (cursor 기반)
            links = data.get("_links", {})
            next_link = links.get("next")
            if next_link and "cursor=" in next_link:
                cursor = next_link.split("cursor=")[1].split("&")[0]
                page_num += 1
            else:
                break
        
        return all_pages
    
    def _get_space_id(self, space_key):
        """space_key로 space_id 조회"""
        cloud_id = self.get_cloud_id()
        if not cloud_id:
            return None
        
        # 모든 스페이스에서 검색
        url = f"{API_URL}/ex/confluence/{cloud_id}/wiki/api/v2/spaces"
        cursor = None
        
        while True:
            params = {"limit": 250}
            if cursor:
                params["cursor"] = cursor
            
            response = requests.get(url, headers=self.get_headers(), params=params)
            
            if response.status_code == 401:
                self.refresh_token()
                response = requests.get(url, headers=self.get_headers(), params=params)
            
            if response.status_code != 200:
                return None
            
            data = response.json()
            for space in data.get("results", []):
                if space.get("key") == space_key:
                    return space.get("id")
            
            # 다음 페이지
            links = data.get("_links", {})
            next_link = links.get("next")
            if next_link and "cursor=" in next_link:
                cursor = next_link.split("cursor=")[1].split("&")[0]
            else:
                break
        
        return None
    
    def sync_pages(self, space_key="AEGIS"):
        """페이지 동기화 (API v2)"""
        print(f"\n[*] Syncing {space_key} space...")
        
        pages = self.get_all_pages(space_key)
        print(f"[*] Found {len(pages)} pages")
        
        if not pages:
            return
        
        cloud_id = self.get_cloud_id()
        base_url = f"{API_URL}/ex/confluence/{cloud_id}/wiki/api/v2"
        
        index = {
            "space_key": space_key,
            "synced_at": datetime.now().isoformat(),
            "total_pages": len(pages),
            "pages": []
        }
        
        for i, page in enumerate(pages):
            page_id = page["id"]
            title = page.get("title", "Untitled")
            
            print(f"  [{i+1}/{len(pages)}] {title}")
            
            try:
                # API v2에서는 body를 별도로 가져와야 함
                body_url = f"{base_url}/pages/{page_id}?body-format=storage"
                body_response = requests.get(body_url, headers=self.get_headers())
                
                body = ""
                version_date = "Unknown"
                
                if body_response.status_code == 200:
                    page_detail = body_response.json()
                    body = page_detail.get("body", {}).get("storage", {}).get("value", "")
                    version_date = page_detail.get("version", {}).get("createdAt", "Unknown")
                
                # 파일명 생성
                safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_')).strip()[:50]
                filename = f"{page_id}_{safe_title}.md"
                filepath = CACHE_DIR / filename
                
                # 마크다운 저장
                md_content = f"""# {title}

> **Page ID**: {page_id}
> **Last Updated**: {version_date}

---

{self._html_to_text(body)}
"""
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(md_content)
                
                index["pages"].append({
                    "id": page_id,
                    "title": title,
                    "filename": filename
                })
                
            except Exception as e:
                print(f"    [WARN] Error: {e}")
        
        # 인덱스 저장
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        
        print(f"\n[OK] Sync complete! {len(index['pages'])} pages saved")
        print(f"[*] Cache location: {CACHE_DIR}")
    
    def _html_to_text(self, html):
        """HTML to Text 변환"""
        import re
        
        if not html:
            return ""
        
        text = re.sub(r'<br\s*/?>', '\n', html)
        text = re.sub(r'<p[^>]*>', '\n', text)
        text = re.sub(r'</p>', '\n', text)
        text = re.sub(r'<h([1-6])[^>]*>(.*?)</h\1>', r'\n## \2\n', text)
        text = re.sub(r'<li[^>]*>', '- ', text)
        text = re.sub(r'</li>', '\n', text)
        text = re.sub(r'<[^>]+>', '', text)
        
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&amp;', '&')
        
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Confluence OAuth 2.0 Integration')
    parser.add_argument('--auth', action='store_true', help='OAuth 인증 실행')
    parser.add_argument('--refresh', action='store_true', help='토큰 갱신')
    parser.add_argument('--sync', action='store_true', help='페이지 동기화')
    parser.add_argument('--spaces', action='store_true', help='스페이스 목록 조회')
    parser.add_argument('--find', type=str, help='스페이스 검색 (키워드)')
    parser.add_argument('--space', type=str, default='AEGIS', help='스페이스 키 (기본: AEGIS)')
    
    args = parser.parse_args()
    
    try:
        oauth = ConfluenceOAuth()
        
        if args.auth:
            oauth.authorize()
        elif args.refresh:
            oauth.refresh_token()
        elif args.spaces:
            oauth.list_spaces()
        elif args.find:
            oauth.find_space(args.find)
        elif args.sync:
            oauth.sync_pages(args.space)
        else:
            parser.print_help()
    
    except ValueError as e:
        print(f"\n[ERROR] Configuration error:\n{e}")
    except Exception as e:
        print(f"\n[ERROR] {e}")


if __name__ == "__main__":
    main()
