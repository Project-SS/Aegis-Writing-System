import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Cache directory path
const CACHE_DIR = path.join(process.cwd(), '..', 'integrations', 'confluence', 'cache');
const INDEX_FILE = path.join(CACHE_DIR, 'page_index.json');

interface PageIndex {
  space_key: string;
  synced_at: string;
  total_pages: number;
  pages: {
    id: string;
    title: string;
    filename: string;
    url: string;
  }[];
}

// GET: Search Confluence pages
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const pageId = searchParams.get('id');

    // Load index
    if (!fs.existsSync(INDEX_FILE)) {
      return NextResponse.json(
        { error: '캐시된 데이터가 없습니다. 동기화를 먼저 실행해주세요.' },
        { status: 404 }
      );
    }

    const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
    const index: PageIndex = JSON.parse(indexData);

    // Get specific page by ID
    if (pageId) {
      const page = index.pages.find(p => p.id === pageId);
      if (!page) {
        return NextResponse.json(
          { error: '페이지를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const filePath = path.join(CACHE_DIR, page.filename);
      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { error: '페이지 내용을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      return NextResponse.json({
        ...page,
        content,
      });
    }

    // Search pages
    if (query) {
      const queryLower = query.toLowerCase();
      const results = index.pages.filter(page => {
        const titleMatch = page.title.toLowerCase().includes(queryLower);
        if (titleMatch) return true;

        // Also search in content
        const filePath = path.join(CACHE_DIR, page.filename);
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8').toLowerCase();
          return content.includes(queryLower);
        }
        return false;
      });

      return NextResponse.json({
        query,
        total: results.length,
        results: results.slice(0, 20), // Limit to 20 results
      });
    }

    // Return all pages (paginated)
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const start = (page - 1) * limit;
    const end = start + limit;

    return NextResponse.json({
      total: index.total_pages,
      page,
      limit,
      synced_at: index.synced_at,
      results: index.pages.slice(start, end),
    });
  } catch (error) {
    console.error('Confluence API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Confluence 검색 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}
