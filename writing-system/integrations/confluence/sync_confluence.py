#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Confluence AEGIS Space Sync Tool
AEGIS 스페이스의 모든 문서를 로컬에 동기화합니다.

사용법:
    python sync_confluence.py --fetch          # 문서 목록 가져오기
    python sync_confluence.py --sync           # 전체 동기화
    python sync_confluence.py --search "키워드" # 문서 검색
"""

import os
import sys
import json
import argparse
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict
import base64

# Windows 콘솔 UTF-8 출력 설정
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# 설정 파일 경로
CONFIG_PATH = Path(__file__).parent / "confluence_config.json"
CACHE_DIR = Path(__file__).parent / "cache"
INDEX_FILE = CACHE_DIR / "page_index.json"


def load_config() -> dict:
    """설정 파일 로드"""
    with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)


def get_auth_headers() -> dict:
    """
    인증 헤더 생성
    환경 변수에서 인증 정보를 가져옵니다:
    - CONFLUENCE_EMAIL: Atlassian 계정 이메일
    - CONFLUENCE_API_TOKEN: API 토큰 (https://id.atlassian.com/manage-profile/security/api-tokens)
    """
    email = os.environ.get('CONFLUENCE_EMAIL')
    api_token = os.environ.get('CONFLUENCE_API_TOKEN')
    
    if not email or not api_token:
        raise ValueError(
            "환경 변수를 설정해주세요:\n"
            "  $env:CONFLUENCE_EMAIL = 'your-email@krafton.com'\n"
            "  $env:CONFLUENCE_API_TOKEN = 'your-api-token'\n\n"
            "API 토큰 발급: https://id.atlassian.com/manage-profile/security/api-tokens"
        )
    
    credentials = base64.b64encode(f"{email}:{api_token}".encode()).decode()
    return {
        "Authorization": f"Basic {credentials}",
        "Content-Type": "application/json",
        "Accept": "application/json"
    }


class ConfluenceSync:
    def __init__(self):
        self.config = load_config()
        self.base_url = self.config['confluence']['base_url']
        self.space_key = self.config['confluence']['space_key']
        self.headers = get_auth_headers()
        
        # 캐시 디렉토리 생성
        CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    def get_all_pages(self, limit: int = 100) -> List[Dict]:
        """AEGIS 스페이스의 모든 페이지 목록 가져오기 (REST API v1 사용)"""
        # REST API v1 엔드포인트 사용
        url = f"{self.base_url}/wiki/rest/api/content"
        params = {
            "spaceKey": self.space_key,
            "type": "page",
            "limit": limit,
            "expand": "version,body.storage,history.createdBy,history.lastUpdated.by"
        }
        
        all_pages = []
        start = 0
        
        while True:
            params["start"] = start
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            data = response.json()
            
            results = data.get('results', [])
            all_pages.extend(results)
            
            # 다음 페이지가 있는지 확인
            if len(results) < limit:
                break
            
            start += limit
        
        return all_pages
    
    def get_page_content(self, page_id: str) -> Dict:
        """특정 페이지의 상세 내용 가져오기 (REST API v1)"""
        url = f"{self.base_url}/wiki/rest/api/content/{page_id}"
        params = {
            "expand": "body.storage,version"
        }
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json()
    
    def search_pages(self, query: str) -> List[Dict]:
        """CQL로 페이지 검색"""
        url = f"{self.base_url}/wiki/rest/api/content/search"
        params = {
            "cql": f'space="{self.space_key}" AND text~"{query}"',
            "limit": 50
        }
        
        response = requests.get(url, headers=self.headers, params=params)
        response.raise_for_status()
        return response.json().get('results', [])
    
    def sync_all_pages(self) -> dict:
        """모든 페이지를 로컬에 동기화"""
        print(f"📥 AEGIS 스페이스 동기화 시작...")
        
        pages = self.get_all_pages()
        print(f"📄 {len(pages)}개 페이지 발견")
        
        index = {
            "space_key": self.space_key,
            "synced_at": datetime.now().isoformat(),
            "total_pages": len(pages),
            "pages": []
        }
        
        for i, page in enumerate(pages):
            page_id = page['id']
            title = page['title']
            
            print(f"  [{i+1}/{len(pages)}] {title}")
            
            try:
                # 본문 추출 (이미 expand로 가져옴)
                body = page.get('body', {}).get('storage', {}).get('value', '')
                version_info = page.get('version', {})
                history_info = page.get('history', {})
                
                # 작성자 정보 추출
                created_by = history_info.get('createdBy', {})
                created_by_name = created_by.get('displayName', 'Unknown')
                created_by_email = created_by.get('email', '')
                created_date = history_info.get('createdDate', 'Unknown')
                
                # 최종 수정자 정보 추출
                last_updated = history_info.get('lastUpdated', {})
                updated_by = last_updated.get('by', {})
                updated_by_name = updated_by.get('displayName', 'Unknown')
                
                # 마크다운 파일로 저장
                safe_title = "".join(c for c in title if c.isalnum() or c in (' ', '-', '_', '가-힣')).strip()
                safe_title = safe_title[:50] if len(safe_title) > 50 else safe_title
                filename = f"{page_id}_{safe_title}.md"
                filepath = CACHE_DIR / filename
                
                # 페이지 URL 생성
                page_url = f"{self.base_url}/wiki/spaces/{self.space_key}/pages/{page_id}"
                
                # 메타데이터와 함께 저장
                md_content = f"""# {title}

> **Page ID**: {page_id}
> **URL**: {page_url}
> **Created By**: {created_by_name}
> **Created Date**: {created_date}
> **Last Updated By**: {updated_by_name}
> **Last Updated**: {version_info.get('when', 'Unknown')}
> **Version**: {version_info.get('number', 'Unknown')}

---

{self._html_to_text(body)}
"""
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(md_content)
                
                index['pages'].append({
                    "id": page_id,
                    "title": title,
                    "filename": filename,
                    "url": page_url,
                    "created_by": created_by_name,
                    "created_by_email": created_by_email,
                    "created_date": created_date,
                    "updated_by": updated_by_name,
                    "updated_date": version_info.get('when', '')
                })
                
            except Exception as e:
                print(f"    ⚠️ 오류: {e}")
        
        # 인덱스 파일 저장
        with open(INDEX_FILE, 'w', encoding='utf-8') as f:
            json.dump(index, f, ensure_ascii=False, indent=2)
        
        print(f"\n✅ 동기화 완료! {len(index['pages'])}개 페이지 저장됨")
        print(f"📁 캐시 위치: {CACHE_DIR}")
        
        return index
    
    def _html_to_text(self, html: str) -> str:
        """간단한 HTML to Text 변환"""
        import re
        
        if not html:
            return ""
        
        # 기본적인 HTML 태그 제거
        text = re.sub(r'<br\s*/?>', '\n', html)
        text = re.sub(r'<p[^>]*>', '\n', text)
        text = re.sub(r'</p>', '\n', text)
        text = re.sub(r'<h1[^>]*>(.*?)</h1>', r'\n# \1\n', text)
        text = re.sub(r'<h2[^>]*>(.*?)</h2>', r'\n## \1\n', text)
        text = re.sub(r'<h3[^>]*>(.*?)</h3>', r'\n### \1\n', text)
        text = re.sub(r'<h([4-6])[^>]*>(.*?)</h\1>', r'\n#### \2\n', text)
        text = re.sub(r'<li[^>]*>', '- ', text)
        text = re.sub(r'</li>', '\n', text)
        text = re.sub(r'<strong[^>]*>(.*?)</strong>', r'**\1**', text)
        text = re.sub(r'<em[^>]*>(.*?)</em>', r'*\1*', text)
        text = re.sub(r'<code[^>]*>(.*?)</code>', r'`\1`', text)
        text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r'[\2](\1)', text)
        text = re.sub(r'<[^>]+>', '', text)
        
        # HTML 엔티티 변환
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&amp;', '&')
        text = text.replace('&quot;', '"')
        text = text.replace('&#39;', "'")
        
        # 연속 줄바꿈 정리
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def get_cached_index(self) -> Optional[dict]:
        """캐시된 인덱스 가져오기"""
        if INDEX_FILE.exists():
            with open(INDEX_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None
    
    def list_cached_pages(self) -> List[Dict]:
        """캐시된 페이지 목록 출력"""
        index = self.get_cached_index()
        if not index:
            print("❌ 캐시된 데이터가 없습니다. --sync를 먼저 실행하세요.")
            return []
        
        print(f"\n📚 AEGIS 스페이스 문서 목록")
        print(f"   동기화 시간: {index['synced_at']}")
        print(f"   총 {index['total_pages']}개 문서\n")
        
        for i, page in enumerate(index['pages'], 1):
            print(f"  {i}. {page['title']}")
            print(f"     └─ {page['url']}")
        
        return index['pages']


def main():
    parser = argparse.ArgumentParser(description='Confluence AEGIS Space Sync Tool')
    parser.add_argument('--fetch', action='store_true', help='페이지 목록만 가져오기')
    parser.add_argument('--sync', action='store_true', help='전체 동기화')
    parser.add_argument('--list', action='store_true', help='캐시된 페이지 목록 보기')
    parser.add_argument('--search', type=str, help='문서 검색')
    
    args = parser.parse_args()
    
    try:
        sync = ConfluenceSync()
        
        if args.fetch:
            pages = sync.get_all_pages()
            print(f"\n📄 AEGIS 스페이스에 {len(pages)}개 페이지가 있습니다:\n")
            for page in pages:
                print(f"  - {page['title']} (ID: {page['id']})")
        
        elif args.sync:
            sync.sync_all_pages()
        
        elif args.list:
            sync.list_cached_pages()
        
        elif args.search:
            results = sync.search_pages(args.search)
            print(f"\n🔍 '{args.search}' 검색 결과: {len(results)}개\n")
            for result in results:
                print(f"  - {result['title']}")
                print(f"    {sync.base_url}{result['_links']['webui']}")
        
        else:
            parser.print_help()
    
    except ValueError as e:
        print(f"\n❌ 인증 오류:\n{e}")
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ API 오류: {e}")
        if e.response.status_code == 401:
            print("   → API 토큰이 만료되었거나 잘못되었습니다.")
        elif e.response.status_code == 403:
            print("   → AEGIS 스페이스 접근 권한이 없습니다.")
        elif e.response.status_code == 404:
            print("   → 스페이스를 찾을 수 없습니다. 스페이스 키를 확인하세요.")
    except Exception as e:
        print(f"\n❌ 오류: {e}")


if __name__ == "__main__":
    main()
