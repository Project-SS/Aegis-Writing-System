import { NextRequest, NextResponse } from 'next/server';

// Jira API configuration
const JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://cloud.jira.krafton.com';
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'AEGIS';

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  type: string;
  priority: string;
  assignee: string | null;
  created: string;
  updated: string;
  url: string;
}

// Helper to get auth headers
function getAuthHeaders(): HeadersInit | null {
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!email || !apiToken) {
    return null;
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

// GET: Search Jira issues
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const issueKey = searchParams.get('key');
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const headers = getAuthHeaders();

    if (!headers) {
      // Return mock data if no credentials
      return NextResponse.json({
        message: 'Jira API 인증 정보가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
        mock: true,
        issues: getMockIssues(query, status, type),
      });
    }

    // Build JQL query
    let jql = `project = ${JIRA_PROJECT_KEY}`;
    
    if (query) {
      jql += ` AND (summary ~ "${query}" OR description ~ "${query}")`;
    }
    if (status) {
      jql += ` AND status = "${status}"`;
    }
    if (type) {
      jql += ` AND issuetype = "${type}"`;
    }
    if (issueKey) {
      jql = `key = "${issueKey}"`;
    }

    jql += ' ORDER BY updated DESC';

    const url = `${JIRA_BASE_URL}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=20`;
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Jira 인증에 실패했습니다. API 토큰을 확인해주세요.' },
          { status: 401 }
        );
      }
      throw new Error(`Jira API error: ${response.status}`);
    }

    const data = await response.json();

    const issues: JiraIssue[] = data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || 'Unknown',
      type: issue.fields.issuetype?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'None',
      assignee: issue.fields.assignee?.displayName || null,
      created: issue.fields.created,
      updated: issue.fields.updated,
      url: `${JIRA_BASE_URL}/browse/${issue.key}`,
    }));

    return NextResponse.json({
      total: data.total,
      issues,
    });
  } catch (error) {
    console.error('Jira API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Jira 검색 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}

// Mock data for development/demo
function getMockIssues(query?: string | null, status?: string | null, type?: string | null): JiraIssue[] {
  const mockIssues: JiraIssue[] = [
    {
      id: '1',
      key: 'AEGIS-101',
      summary: '캐릭터 이동 시스템 구현',
      status: 'In Progress',
      type: 'Task',
      priority: 'High',
      assignee: '김개발',
      created: '2026-01-10T10:00:00Z',
      updated: '2026-01-12T14:30:00Z',
      url: `${JIRA_BASE_URL}/browse/AEGIS-101`,
    },
    {
      id: '2',
      key: 'AEGIS-102',
      summary: 'UI 디자인 시스템 설계',
      status: 'Done',
      type: 'Story',
      priority: 'Medium',
      assignee: '이디자인',
      created: '2026-01-08T09:00:00Z',
      updated: '2026-01-11T16:00:00Z',
      url: `${JIRA_BASE_URL}/browse/AEGIS-102`,
    },
    {
      id: '3',
      key: 'AEGIS-103',
      summary: '로그인 화면 버그 수정',
      status: 'To Do',
      type: 'Bug',
      priority: 'Critical',
      assignee: null,
      created: '2026-01-12T08:00:00Z',
      updated: '2026-01-12T08:00:00Z',
      url: `${JIRA_BASE_URL}/browse/AEGIS-103`,
    },
    {
      id: '4',
      key: 'AEGIS-104',
      summary: '서버 성능 최적화',
      status: 'In Progress',
      type: 'Task',
      priority: 'High',
      assignee: '박서버',
      created: '2026-01-09T11:00:00Z',
      updated: '2026-01-12T10:00:00Z',
      url: `${JIRA_BASE_URL}/browse/AEGIS-104`,
    },
    {
      id: '5',
      key: 'AEGIS-105',
      summary: '게임 튜토리얼 기획',
      status: 'In Review',
      type: 'Story',
      priority: 'Medium',
      assignee: '최기획',
      created: '2026-01-07T14:00:00Z',
      updated: '2026-01-11T09:00:00Z',
      url: `${JIRA_BASE_URL}/browse/AEGIS-105`,
    },
  ];

  let filtered = mockIssues;

  if (query) {
    const queryLower = query.toLowerCase();
    filtered = filtered.filter(issue => 
      issue.summary.toLowerCase().includes(queryLower) ||
      issue.key.toLowerCase().includes(queryLower)
    );
  }

  if (status) {
    filtered = filtered.filter(issue => 
      issue.status.toLowerCase() === status.toLowerCase()
    );
  }

  if (type) {
    filtered = filtered.filter(issue => 
      issue.type.toLowerCase() === type.toLowerCase()
    );
  }

  return filtered;
}
