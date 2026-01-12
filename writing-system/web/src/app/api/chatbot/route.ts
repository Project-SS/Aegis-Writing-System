import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';
import { getSearchEngine, SearchResult, SearchableDocument } from '@/lib/search-engine';

// Cache directory path (relative to project root)
const CACHE_DIR = path.join(process.cwd(), '..', 'integrations', 'confluence', 'cache');
const INDEX_FILE = path.join(CACHE_DIR, 'page_index.json');
const CONFIG_FILE = path.join(process.cwd(), '..', 'integrations', 'confluence', 'confluence_config.json');

// Confluence base URL (fallback)
const DEFAULT_CONFLUENCE_BASE_URL = 'https://krafton.atlassian.net';
const DEFAULT_SPACE_KEY = 'AEGIS';

// Jira configuration
const DEFAULT_JIRA_BASE_URL = 'https://cloud.jira.krafton.com';
const DEFAULT_JIRA_PROJECT_KEY = 'AEGIS';

interface ChatRequest {
  message: string;
  provider: 'claude' | 'gemini';
  apiKey: string;
  jiraAuth?: {
    email: string;
    apiToken: string;
    baseUrl?: string;
    projectKey?: string;
  };
}

interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  type: string;
  priority: string;
  assignee: string | null;
  description?: string;
  created: string;
  updated: string;
  url: string;
}

interface ConfluenceConfig {
  confluence: {
    base_url: string;
    space_key: string;
  };
}

interface PageIndex {
  space_key: string;
  synced_at: string;
  total_pages: number;
  pages: {
    id: string;
    title: string;
    filename: string;
    url?: string;
  }[];
}

// Track if search engine is initialized
let searchEngineInitialized = false;
let lastIndexedAt: string | null = null;

// Load Confluence config
function loadConfluenceConfig(): { baseUrl: string; spaceKey: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config: ConfluenceConfig = JSON.parse(configData);
      return {
        baseUrl: config.confluence.base_url || DEFAULT_CONFLUENCE_BASE_URL,
        spaceKey: config.confluence.space_key || DEFAULT_SPACE_KEY,
      };
    }
  } catch (error) {
    console.error('Error loading Confluence config:', error);
  }
  return { baseUrl: DEFAULT_CONFLUENCE_BASE_URL, spaceKey: DEFAULT_SPACE_KEY };
}

// Generate page URL
function generatePageUrl(pageId: string, baseUrl: string, spaceKey: string): string {
  return `${baseUrl}/wiki/spaces/${spaceKey}/pages/${pageId}`;
}

// Check if the query is related to Jira
function isJiraRelatedQuery(query: string): boolean {
  const jiraKeywords = [
    // Korean keywords
    '지라', '이슈', '티켓', '일감', '버그', '태스크', '스토리', '에픽',
    '진행중', '진행 중', '완료', '대기', '할일', '할 일', '담당자', '담당',
    '우선순위', '마감', '기한', '스프린트', '백로그',
    // English keywords
    'jira', 'issue', 'ticket', 'bug', 'task', 'story', 'epic',
    'in progress', 'done', 'todo', 'to do', 'assignee', 'priority',
    'sprint', 'backlog', 'aegis-',
  ];
  
  const queryLower = query.toLowerCase();
  return jiraKeywords.some(keyword => queryLower.includes(keyword));
}

// Search Jira issues
async function searchJiraIssues(
  query: string,
  jiraAuth?: ChatRequest['jiraAuth']
): Promise<JiraIssue[]> {
  const baseUrl = jiraAuth?.baseUrl || process.env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL;
  const projectKey = jiraAuth?.projectKey || process.env.JIRA_PROJECT_KEY || DEFAULT_JIRA_PROJECT_KEY;
  const email = jiraAuth?.email || process.env.JIRA_EMAIL;
  const apiToken = jiraAuth?.apiToken || process.env.JIRA_API_TOKEN;

  if (!email || !apiToken) {
    console.log('Jira credentials not configured');
    return [];
  }

  try {
    // Extract search terms from query
    const searchTerms = extractJiraSearchTerms(query);
    
    // Build JQL query
    let jql = `project = ${projectKey}`;
    
    if (searchTerms.text) {
      jql += ` AND (summary ~ "${searchTerms.text}" OR description ~ "${searchTerms.text}")`;
    }
    if (searchTerms.status) {
      jql += ` AND status = "${searchTerms.status}"`;
    }
    if (searchTerms.type) {
      jql += ` AND issuetype = "${searchTerms.type}"`;
    }
    if (searchTerms.issueKey) {
      jql = `key = "${searchTerms.issueKey}"`;
    }
    
    jql += ' ORDER BY updated DESC';

    const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const url = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=15&fields=summary,status,issuetype,priority,assignee,description,created,updated`;
    
    console.log('Jira search JQL:', jql);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Jira API error:', response.status, await response.text());
      return [];
    }

    const data = await response.json();
    
    return data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || 'Unknown',
      type: issue.fields.issuetype?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'None',
      assignee: issue.fields.assignee?.displayName || null,
      description: extractPlainText(issue.fields.description),
      created: issue.fields.created,
      updated: issue.fields.updated,
      url: `${baseUrl}/browse/${issue.key}`,
    }));
  } catch (error) {
    console.error('Jira search error:', error);
    return [];
  }
}

// Extract plain text from Jira's ADF (Atlassian Document Format)
function extractPlainText(adf: any): string {
  if (!adf) return '';
  if (typeof adf === 'string') return adf;
  
  let text = '';
  
  function traverse(node: any) {
    if (!node) return;
    
    if (node.type === 'text' && node.text) {
      text += node.text + ' ';
    }
    
    if (node.content && Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
  }
  
  traverse(adf);
  return text.trim().substring(0, 500);
}

// Extract search terms from natural language query
function extractJiraSearchTerms(query: string): {
  text?: string;
  status?: string;
  type?: string;
  issueKey?: string;
} {
  const result: {
    text?: string;
    status?: string;
    type?: string;
    issueKey?: string;
  } = {};
  
  // Check for specific issue key (e.g., AEGIS-123)
  const issueKeyMatch = query.match(/([A-Z]{2,10}-\d{1,6})/);
  if (issueKeyMatch) {
    result.issueKey = issueKeyMatch[1];
    return result;
  }
  
  // Extract status
  const statusMap: { [key: string]: string } = {
    '진행중': 'In Progress',
    '진행 중': 'In Progress',
    'in progress': 'In Progress',
    '완료': 'Done',
    'done': 'Done',
    '대기': 'To Do',
    '할일': 'To Do',
    '할 일': 'To Do',
    'todo': 'To Do',
    'to do': 'To Do',
    '검토': 'In Review',
    '리뷰': 'In Review',
    'review': 'In Review',
    'in review': 'In Review',
  };
  
  const queryLower = query.toLowerCase();
  for (const [keyword, status] of Object.entries(statusMap)) {
    if (queryLower.includes(keyword)) {
      result.status = status;
      break;
    }
  }
  
  // Extract type
  const typeMap: { [key: string]: string } = {
    '버그': 'Bug',
    'bug': 'Bug',
    '태스크': 'Task',
    'task': 'Task',
    '스토리': 'Story',
    'story': 'Story',
    '에픽': 'Epic',
    'epic': 'Epic',
  };
  
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (queryLower.includes(keyword)) {
      result.type = type;
      break;
    }
  }
  
  // Extract search text (remove common query words)
  const removeWords = [
    '지라', 'jira', '이슈', 'issue', '티켓', 'ticket', '일감',
    '찾아줘', '찾아', '검색', '보여줘', '알려줘', '목록', '리스트',
    '진행중', '진행 중', '완료', '대기', '할일', '할 일',
    '버그', 'bug', '태스크', 'task', '스토리', 'story', '에픽', 'epic',
    '관련', '있는', '모든', '전체', '최근',
  ];
  
  let searchText = query;
  for (const word of removeWords) {
    searchText = searchText.replace(new RegExp(word, 'gi'), '');
  }
  searchText = searchText.replace(/\s+/g, ' ').trim();
  
  if (searchText.length > 1) {
    result.text = searchText;
  }
  
  return result;
}

// Build Jira context for AI
function buildJiraContext(issues: JiraIssue[]): string {
  if (issues.length === 0) {
    return '';
  }
  
  let context = '\n\n## Jira 이슈 정보 (내부 참조용 - 답변에 이 섹션을 포함하지 마세요)\n\n';
  context += '**주의**: 아래는 답변 작성을 위한 Jira 이슈 정보입니다. 이슈 링크는 시스템이 자동으로 표시합니다.\n\n';
  
  for (const issue of issues) {
    context += `### ${issue.key}: ${issue.summary}\n`;
    context += `- **상태**: ${issue.status}\n`;
    context += `- **유형**: ${issue.type}\n`;
    context += `- **우선순위**: ${issue.priority}\n`;
    context += `- **담당자**: ${issue.assignee || '미지정'}\n`;
    context += `- **업데이트**: ${new Date(issue.updated).toLocaleDateString('ko-KR')}\n`;
    if (issue.description) {
      context += `- **설명**: ${issue.description.substring(0, 300)}${issue.description.length > 300 ? '...' : ''}\n`;
    }
    context += '\n';
  }
  
  return context;
}

// Load cached Confluence pages and initialize search engine
function loadAndIndexDocuments(): { index: PageIndex | null; contents: Map<string, string> } {
  const contents = new Map<string, string>();
  let index: PageIndex | null = null;

  try {
    if (fs.existsSync(INDEX_FILE)) {
      const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
      index = JSON.parse(indexData);

      // Check if we need to re-index
      const needsReindex = !searchEngineInitialized || lastIndexedAt !== index?.synced_at;

      // Load page contents
      if (index && index.pages) {
        const { baseUrl, spaceKey } = loadConfluenceConfig();
        const searchableDocs: SearchableDocument[] = [];

        for (const page of index.pages) {
          const filePath = path.join(CACHE_DIR, page.filename);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            contents.set(page.id, content);

            // Prepare for search engine
            if (needsReindex) {
              searchableDocs.push({
                id: page.id,
                title: page.title,
                content: content,
                url: page.url || generatePageUrl(page.id, baseUrl, spaceKey),
              });
            }
          }
        }

        // Initialize/update search engine
        if (needsReindex && searchableDocs.length > 0) {
          const searchEngine = getSearchEngine();
          searchEngine.indexDocuments(searchableDocs);
          searchEngineInitialized = true;
          lastIndexedAt = index.synced_at;
          console.log(`Search engine indexed ${searchableDocs.length} documents`);
        }
      }
    }
  } catch (error) {
    console.error('Error loading cached pages:', error);
  }

  return { index, contents };
}

// Advanced search using the search engine
function searchRelevantPages(
  query: string,
  index: PageIndex | null,
  contents: Map<string, string>,
  maxResults: number = 30
): { id: string; title: string; url: string; snippet: string; score: number; matchDetails?: SearchResult['matchDetails'] }[] {
  if (!index) return [];

  const searchEngine = getSearchEngine();
  const stats = searchEngine.getStats();

  // If search engine is not initialized, fall back to basic search
  if (stats.documentCount === 0) {
    console.log('Search engine not initialized, using basic search');
    return basicSearch(query, index, contents, maxResults);
  }

  // Use advanced search engine
  const results = searchEngine.search(query, maxResults);
  
  console.log(`Advanced search for "${query}" found ${results.length} results`);
  if (results.length > 0) {
    console.log('Top result:', results[0].title, 'Score:', results[0].score.toFixed(2));
    console.log('Match details:', JSON.stringify(results[0].matchDetails));
  }

  return results.map(r => ({
    id: r.id,
    title: r.title,
    url: r.url,
    snippet: r.snippet,
    score: r.score,
    matchDetails: r.matchDetails,
  }));
}

// Basic search fallback
function basicSearch(
  query: string,
  index: PageIndex | null,
  contents: Map<string, string>,
  maxResults: number = 30
): { id: string; title: string; url: string; snippet: string; score: number }[] {
  if (!index) return [];

  const { baseUrl, spaceKey } = loadConfluenceConfig();
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/).filter(k => k.length > 1);
  
  const results: { id: string; title: string; url: string; snippet: string; score: number }[] = [];

  for (const page of index.pages) {
    const content = contents.get(page.id) || '';
    const contentLower = content.toLowerCase();
    const titleLower = page.title.toLowerCase();

    let score = 0;
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) score += 10;
      const contentMatches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += Math.min(contentMatches, 5);
    }

    if (score > 0) {
      let snippet = '';
      for (const keyword of keywords) {
        const idx = contentLower.indexOf(keyword);
        if (idx !== -1) {
          const start = Math.max(0, idx - 100);
          const end = Math.min(content.length, idx + 200);
          snippet = content.substring(start, end).replace(/\n+/g, ' ').trim();
          if (start > 0) snippet = '...' + snippet;
          if (end < content.length) snippet = snippet + '...';
          break;
        }
      }

      const pageUrl = page.url || generatePageUrl(page.id, baseUrl, spaceKey);

      results.push({
        id: page.id,
        title: page.title,
        url: pageUrl,
        snippet: snippet || content.substring(0, 200) + '...',
        score,
      });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// Build context from relevant pages
function buildContext(
  relevantPages: { id: string; title: string; url: string; snippet: string; score: number; matchDetails?: SearchResult['matchDetails'] }[], 
  contents: Map<string, string>
): string {
  if (relevantPages.length === 0) {
    return '관련 문서를 찾을 수 없습니다.';
  }

  let context = '## 관련 Confluence 문서 (내부 참조용 - 답변에 이 섹션을 포함하지 마세요)\n\n';
  context += '**주의**: 아래는 답변 작성을 위한 참고 자료입니다. 답변 본문에 "참조 문서" 목록이나 URL을 절대 포함하지 마세요. 문서 링크는 시스템이 자동으로 표시합니다.\n\n';
  
  for (const page of relevantPages) {
    const fullContent = contents.get(page.id) || page.snippet;
    // Limit content length per page - give more content to higher scored documents
    const maxLength = page.score > 30 ? 3000 : 2000;
    const truncatedContent = fullContent.length > maxLength 
      ? fullContent.substring(0, maxLength) + '...'
      : fullContent;
    
    context += `### 문서: ${page.title} (관련도: ${page.score.toFixed(1)})\n\n`;
    context += `${truncatedContent}\n\n---\n\n`;
  }

  return context;
}

const systemPrompt = `당신은 AEGIS 게임 개발 프로젝트의 AI 어시스턴트입니다.
사용자의 질문에 대해 제공된 Confluence 문서와 Jira 정보를 바탕으로 정확하고 도움이 되는 답변을 제공합니다.

답변 시 다음 지침을 반드시 따르세요:
1. 제공된 문서 내용을 기반으로 답변하세요.
2. 문서에 없는 내용은 추측하지 말고, 해당 정보가 없다고 명시하세요.
3. **중요**: 답변 본문에 "참조 문서", "관련 문서", "출처" 등의 문서 목록을 절대 포함하지 마세요. 참조 문서 링크는 시스템이 자동으로 답변 하단에 별도로 표시합니다.
4. **중요**: URL이나 링크를 답변에 직접 작성하지 마세요.
5. **중요**: Jira 티켓 ID는 반드시 "AEGIS-숫자" 형식(예: AEGIS-514, AEGIS-716)만 언급하세요. UUID나 긴 해시값이 포함된 ID(예: AEGIS-7177d5c59b3-xxx)는 Jira 티켓이 아니므로 언급하지 마세요.
6. 한국어로 친절하게 답변하세요.
7. 기술적인 내용은 명확하고 구체적으로 설명하세요.
8. 마크다운 형식을 활용하여 가독성 좋게 답변하세요:
   - 제목에는 ## 또는 ### 사용
   - 목록에는 - 또는 1. 2. 3. 사용
   - 중요한 내용은 **굵게** 표시
   - 코드나 기술 용어는 \`백틱\`으로 감싸기
   - 테이블이 필요한 경우 마크다운 테이블 형식 사용`;

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { message, provider, apiKey, jiraAuth } = body;

    if (!message) {
      return NextResponse.json(
        { error: '메시지가 필요합니다.' },
        { status: 400 }
      );
    }

    // Load cached pages and initialize search engine
    const { index, contents } = loadAndIndexDocuments();

    // Search relevant pages using advanced search
    const relevantPages = searchRelevantPages(message, index, contents);

    // Build Confluence context
    let context = buildContext(relevantPages, contents);

    // Check if query is Jira-related and search Jira
    let jiraIssues: JiraIssue[] = [];
    if (isJiraRelatedQuery(message)) {
      console.log('Jira-related query detected, searching Jira...');
      jiraIssues = await searchJiraIssues(message, jiraAuth);
      console.log(`Found ${jiraIssues.length} Jira issues`);
      
      // Add Jira context
      context += buildJiraContext(jiraIssues);
    }

    // Get API key from request or environment
    const effectiveApiKey = apiKey || (provider === 'claude' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY);
    const effectiveProvider = provider || (process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini');

    // Build sources list (Confluence + Jira) with match details
    // Sort by score (highest first) and separate by match type
    const sortedPages = [...relevantPages].sort((a, b) => b.score - a.score);
    
    // Categorize by match type
    const titleMatches = sortedPages.filter(p => 
      p.matchDetails?.titleMatch && p.matchDetails.titleMatch > 0
    );
    const contentOnlyMatches = sortedPages.filter(p => 
      !p.matchDetails?.titleMatch || p.matchDetails.titleMatch === 0
    );

    const sources: { 
      type: 'confluence' | 'jira'; 
      title: string; 
      url: string;
      score?: number;
      matchType?: 'title' | 'content';
    }[] = [
      // Title matches first (sorted by score)
      ...titleMatches.map(p => ({
        type: 'confluence' as const,
        title: p.title,
        url: p.url,
        score: p.score,
        matchType: 'title' as const,
      })),
      // Content-only matches (sorted by score)
      ...contentOnlyMatches.map(p => ({
        type: 'confluence' as const,
        title: p.title,
        url: p.url,
        score: p.score,
        matchType: 'content' as const,
      })),
      // Jira issues
      ...jiraIssues.map(issue => ({
        type: 'jira' as const,
        title: `${issue.key}: ${issue.summary}`,
        url: issue.url,
        score: undefined,
        matchType: undefined,
      })),
    ];

    if (!effectiveApiKey) {
      // Return a simple response without AI if no API key
      let responseContent = '';
      
      if (relevantPages.length > 0) {
        responseContent += `## 관련 Confluence 문서\n\n${relevantPages.slice(0, 5).map(p => `- **${p.title}**\n  ${p.snippet}`).join('\n\n')}\n\n`;
      }
      
      if (jiraIssues.length > 0) {
        responseContent += `## 관련 Jira 이슈\n\n${jiraIssues.map(issue => `- **${issue.key}**: ${issue.summary} (${issue.status})`).join('\n')}\n\n`;
      }
      
      responseContent += '(AI 응답을 위해서는 API 키 설정이 필요합니다)';
      
      return NextResponse.json({
        content: responseContent,
        sources,
      });
    }

    // Build user message with context
    const userMessage = `## 사용자 질문
${message}

${context}

위 문서와 이슈 정보를 참고하여 사용자의 질문에 답변해주세요.`;

    let responseContent: string;

    if (effectiveProvider === 'claude') {
      const anthropic = new Anthropic({ apiKey: effectiveApiKey });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      responseContent = textContent?.type === 'text' ? textContent.text : '응답을 생성할 수 없습니다.';
    } else {
      const genAI = new GoogleGenerativeAI(effectiveApiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemPrompt,
      });

      const result = await model.generateContent(userMessage);
      responseContent = result.response.text() || '응답을 생성할 수 없습니다.';
    }

    return NextResponse.json({
      content: responseContent,
      sources,
    });
  } catch (error) {
    console.error('Chatbot API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `채팅 처리 중 오류가 발생했습니다: ${message}` },
      { status: 500 }
    );
  }
}
