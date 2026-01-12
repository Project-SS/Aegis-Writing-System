import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Cache directory path
const CACHE_DIR = path.join(process.cwd(), '..', 'integrations', 'confluence', 'cache');
const INDEX_FILE = path.join(CACHE_DIR, 'page_index.json');
const SYNC_SCRIPT = path.join(process.cwd(), '..', 'integrations', 'confluence', 'sync_confluence.py');

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

// GET: Get sync status
export async function GET() {
  try {
    if (!fs.existsSync(INDEX_FILE)) {
      return NextResponse.json({
        lastSyncedAt: null,
        totalPages: 0,
        status: 'not_synced',
        message: '아직 동기화되지 않았습니다.',
      });
    }

    const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
    const index: PageIndex = JSON.parse(indexData);

    return NextResponse.json({
      lastSyncedAt: index.synced_at,
      totalPages: index.total_pages,
      spaceKey: index.space_key,
      status: 'synced',
    });
  } catch (error) {
    console.error('Sync status error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `동기화 상태 확인 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}

interface SyncRequest {
  confluenceAuth?: {
    email: string;
    apiToken: string;
    baseUrl?: string;
    spaceKey?: string;
  };
}

// POST: Trigger sync
export async function POST(request: NextRequest) {
  try {
    // Parse request body for client-provided auth
    let clientAuth: SyncRequest['confluenceAuth'] = undefined;
    try {
      const body: SyncRequest = await request.json();
      clientAuth = body.confluenceAuth;
    } catch {
      // No body or invalid JSON, will use env vars
    }

    // Check if Python script exists
    if (!fs.existsSync(SYNC_SCRIPT)) {
      return NextResponse.json(
        { 
          error: '동기화 스크립트를 찾을 수 없습니다.',
          message: '동기화 스크립트를 찾을 수 없습니다.',
        },
        { status: 404 }
      );
    }

    // Use client-provided auth or fall back to environment variables
    const email = clientAuth?.email || process.env.CONFLUENCE_EMAIL;
    const apiToken = clientAuth?.apiToken || process.env.CONFLUENCE_API_TOKEN;

    if (!email || !apiToken) {
      // Return current cached data info with error message
      let currentData = { totalPages: 0, lastSyncedAt: null as string | null };
      
      if (fs.existsSync(INDEX_FILE)) {
        try {
          const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
          const index: PageIndex = JSON.parse(indexData);
          currentData = { totalPages: index.total_pages, lastSyncedAt: index.synced_at };
        } catch {
          // Ignore parse errors
        }
      }

      return NextResponse.json(
        { 
          error: 'Confluence 인증 정보가 설정되지 않았습니다.',
          message: 'Confluence 인증 정보가 필요합니다. 플랫폼 설정에서 Confluence 인증 정보를 입력해주세요.',
          hint: '현재 캐시된 데이터를 사용 중입니다.',
          lastSyncedAt: currentData.lastSyncedAt,
          totalPages: currentData.totalPages,
        },
        { status: 401 }
      );
    }

    // Execute sync script - use semicolon for Windows PowerShell compatibility
    const scriptDir = path.dirname(SYNC_SCRIPT);
    const isWindows = process.platform === 'win32';
    const command = isWindows 
      ? `cd /d "${scriptDir}" && python sync_confluence.py --sync`
      : `cd "${scriptDir}" && python sync_confluence.py --sync`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        env: {
          ...process.env,
          CONFLUENCE_EMAIL: email,
          CONFLUENCE_API_TOKEN: apiToken,
        },
        timeout: 300000, // 5 minutes timeout
        shell: isWindows ? 'cmd.exe' : '/bin/sh',
      });

      console.log('Sync stdout:', stdout);
      if (stderr) console.error('Sync stderr:', stderr);

      // Read updated index
      if (fs.existsSync(INDEX_FILE)) {
        const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
        const index: PageIndex = JSON.parse(indexData);

        return NextResponse.json({
          success: true,
          lastSyncedAt: index.synced_at,
          totalPages: index.total_pages,
          message: `동기화 완료! ${index.total_pages}개 문서가 업데이트되었습니다.`,
        });
      }

      return NextResponse.json({
        success: true,
        message: '동기화가 완료되었습니다.',
      });
    } catch (execError: unknown) {
      console.error('Sync execution error:', execError);
      
      const errorObj = execError as { message?: string; stderr?: string };
      const errorMessage = errorObj.message || 'Unknown error';
      const errorStderr = errorObj.stderr || '';
      
      // Check for specific error types
      if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        return NextResponse.json(
          { 
            error: '동기화 시간이 초과되었습니다.',
            message: '동기화 시간이 초과되었습니다. 나중에 다시 시도해주세요.',
          },
          { status: 504 }
        );
      }

      if (errorStderr.includes('401') || errorStderr.includes('인증')) {
        return NextResponse.json(
          { 
            error: 'Confluence 인증 실패',
            message: 'Confluence 인증에 실패했습니다. API 토큰을 확인해주세요.',
          },
          { status: 401 }
        );
      }

      if (errorMessage.includes('python') || errorMessage.includes('not found') || errorMessage.includes('not recognized')) {
        return NextResponse.json(
          { 
            error: 'Python을 찾을 수 없습니다.',
            message: 'Python이 설치되어 있지 않거나 PATH에 등록되지 않았습니다.',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { 
          error: '동기화 실행 오류',
          message: `동기화 실행 중 오류가 발생했습니다: ${errorMessage}`,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Sync API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: '동기화 처리 오류',
        message: `동기화 처리 중 오류가 발생했습니다: ${message}`,
      },
      { status: 500 }
    );
  }
}
