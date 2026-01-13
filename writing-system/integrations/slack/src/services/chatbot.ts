import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

// Types
export interface ChatResponse {
  content: string;
  sources: SourceItem[];
}

export interface SourceItem {
  type: 'confluence' | 'jira';
  title: string;
  url: string;
  score?: number;
  matchType?: 'title' | 'content';
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

// Configuration
const CACHE_DIR = path.join(__dirname, '..', '..', '..', 'confluence', 'cache');
const INDEX_FILE = path.join(CACHE_DIR, 'page_index.json');
const CONFIG_FILE = path.join(__dirname, '..', '..', '..', 'confluence', 'confluence_config.json');

const DEFAULT_CONFLUENCE_BASE_URL = 'https://krafton.atlassian.net';
const DEFAULT_SPACE_KEY = 'AEGIS';
const DEFAULT_JIRA_BASE_URL = process.env.JIRA_BASE_URL || 'https://cloud.jira.krafton.com';
const DEFAULT_JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'AEGIS';

// Load Confluence config
function loadConfluenceConfig(): { baseUrl: string; spaceKey: string } {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const configData = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(configData);
      return {
        baseUrl: config.confluence?.base_url || DEFAULT_CONFLUENCE_BASE_URL,
        spaceKey: config.confluence?.space_key || DEFAULT_SPACE_KEY,
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

// Load cached documents
function loadDocuments(): { index: PageIndex | null; contents: Map<string, string> } {
  const contents = new Map<string, string>();
  let index: PageIndex | null = null;

  try {
    if (fs.existsSync(INDEX_FILE)) {
      const indexData = fs.readFileSync(INDEX_FILE, 'utf-8');
      index = JSON.parse(indexData);

      if (index && index.pages) {
        for (const page of index.pages) {
          const filePath = path.join(CACHE_DIR, page.filename);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            contents.set(page.id, content);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error loading cached pages:', error);
  }

  return { index, contents };
}

// Search relevant pages
function searchRelevantPages(
  query: string,
  index: PageIndex | null,
  contents: Map<string, string>,
  maxResults: number = 10
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

  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

// Check if query is Jira-related
function isJiraRelatedQuery(query: string): boolean {
  const jiraKeywords = [
    '지라', '이슈', '티켓', '일감', '버그', '태스크', '스토리', '에픽',
    '진행중', '진행 중', '완료', '대기', '할일', '할 일', '담당자', '담당',
    'jira', 'issue', 'ticket', 'bug', 'task', 'story', 'epic',
    'in progress', 'done', 'todo', 'assignee', 'aegis-',
  ];

  const queryLower = query.toLowerCase();
  
  // Check for assignee patterns (Korean names)
  const assigneePatterns = [
    /[가-힣]{2,4}(?:님)?의?\s*(?:일감|이슈|티켓|작업)/,
    /[가-힣]{2,4}(?:님|씨)?\s*담당/,
    /담당(?:자)?[:\s]+[가-힣]{2,4}/,
  ];
  
  if (assigneePatterns.some(pattern => pattern.test(query))) {
    return true;
  }
  
  return jiraKeywords.some(keyword => queryLower.includes(keyword));
}

// Extract assignee name from query
function extractAssigneeName(query: string): string | null {
  const assigneePatterns = [
    /([가-힣]{2,4})(?:님)?의\s*(?:일감|이슈|티켓|작업)/,
    /([가-힣]{2,4})(?:님)?\s+(?:일감|이슈|티켓|작업)/,
    /([가-힣]{2,4})(?:님|씨)?\s*담당/,
    /담당(?:자)?[:\s]+([가-힣]{2,4})/,
    /([가-힣]{2,4})(?:님|씨)?\s*(?:에게|한테)\s*(?:할당|배정)/,
  ];
  
  for (const pattern of assigneePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/님|씨|의$/g, '').trim();
    }
  }
  
  return null;
}

// Cache for project assignees
let projectAssigneesCache: { accountId: string; displayName: string; koreanName?: string }[] | null = null;
let assigneesCacheTime: number = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Get all assignable users for the project
async function getProjectAssignees(
  baseUrl: string,
  projectKey: string,
  credentials: string
): Promise<{ accountId: string; displayName: string; koreanName?: string }[]> {
  // Check cache
  if (projectAssigneesCache && Date.now() - assigneesCacheTime < CACHE_DURATION) {
    return projectAssigneesCache;
  }

  try {
    const endpoints = [
      `${baseUrl}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=1000`,
      `${baseUrl}/rest/api/2/user/assignable/search?project=${projectKey}&maxResults=1000`,
    ];
    
    console.log('Fetching project assignees...');
    
    let users: any[] = [];
    
    for (const url of endpoints) {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        users = await response.json() as any[];
        console.log('Fetched', users.length, 'users');
        break;
      }
    }
    
    if (users.length === 0) {
      return [];
    }
    
    // Parse users and extract Korean names
    const parsedUsers = users.map((user: any) => {
      const displayName = user.displayName || '';
      let koreanName: string | undefined;
      
      // Extract Korean name from parentheses: "Raekwan Lee (이래관)"
      const koreanMatch = displayName.match(/\(([가-힣]+)\)/);
      if (koreanMatch) {
        koreanName = koreanMatch[1];
      } else if (/^[가-힣]+$/.test(displayName)) {
        koreanName = displayName;
      }
      
      return {
        accountId: user.accountId,
        displayName: displayName,
        koreanName: koreanName,
      };
    });
    
    projectAssigneesCache = parsedUsers;
    assigneesCacheTime = Date.now();
    
    return parsedUsers;
  } catch (error) {
    console.error('Error fetching project assignees:', error);
    return [];
  }
}

// Find Jira user by Korean name
async function findJiraUserByName(
  searchName: string,
  baseUrl: string,
  projectKey: string,
  credentials: string
): Promise<string | null> {
  try {
    console.log('Searching for user:', searchName);
    
    const assignees = await getProjectAssignees(baseUrl, projectKey, credentials);
    
    // Search by Korean name first
    for (const user of assignees) {
      if (user.koreanName === searchName) {
        console.log('Found by Korean name:', user.displayName);
        return user.accountId;
      }
    }
    
    // Search by displayName containing the search term
    for (const user of assignees) {
      if (user.displayName.includes(searchName)) {
        console.log('Found by displayName:', user.displayName);
        return user.accountId;
      }
    }
    
    console.log('User not found:', searchName);
    return null;
  } catch (error) {
    console.error('Error searching Jira users:', error);
    return null;
  }
}

// Search Jira issues
async function searchJiraIssues(query: string): Promise<JiraIssue[]> {
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  const baseUrl = process.env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL;
  const projectKey = process.env.JIRA_PROJECT_KEY || DEFAULT_JIRA_PROJECT_KEY;

  console.log('Jira config - baseUrl:', baseUrl, 'projectKey:', projectKey, 'email:', email ? 'SET' : 'NOT SET', 'apiToken:', apiToken ? 'SET' : 'NOT SET');

  if (!email || !apiToken) {
    console.log('Jira credentials not configured');
    return [];
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    // Check for specific issue key
    const issueKeyMatch = query.match(/([A-Z]{2,10}-\d{1,6})/);
    let jql: string;

    if (issueKeyMatch) {
      jql = `key = "${issueKeyMatch[1]}"`;
    } else {
      jql = `project = ${projectKey}`;
      
      // Check for assignee
      const assigneeName = extractAssigneeName(query);
      if (assigneeName) {
        console.log('Extracted assignee name:', assigneeName);
        const accountId = await findJiraUserByName(assigneeName, baseUrl, projectKey, credentials);
        if (accountId) {
          jql += ` AND assignee = "${accountId}"`;
        }
      }
      
      // Check for status
      const queryLower = query.toLowerCase();
      if (queryLower.includes('진행중') || queryLower.includes('진행 중')) {
        jql += ` AND status = "In Progress"`;
      } else if (queryLower.includes('완료')) {
        jql += ` AND status = "Done"`;
      } else if (queryLower.includes('대기') || queryLower.includes('할일') || queryLower.includes('할 일')) {
        jql += ` AND status = "To Do"`;
      }
      
      // Check for type
      if (queryLower.includes('버그') || queryLower.includes('bug')) {
        jql += ` AND issuetype = "Bug"`;
      } else if (queryLower.includes('태스크') || queryLower.includes('task') || queryLower.includes('작업')) {
        jql += ` AND issuetype = "Task"`;
      } else if (queryLower.includes('스토리') || queryLower.includes('story')) {
        jql += ` AND issuetype = "Story"`;
      }
      
      jql += ` ORDER BY updated DESC`;
    }

    console.log('Jira JQL:', jql);

    // Try multiple API endpoints for compatibility
    const apiEndpoints = [
      // 1. New POST API (2025+)
      { method: 'POST', url: `${baseUrl}/rest/api/3/search/jql`, useBody: true },
      // 2. Classic GET API v3
      { method: 'GET', url: `${baseUrl}/rest/api/3/search`, useBody: false },
      // 3. Classic GET API v2 (fallback)
      { method: 'GET', url: `${baseUrl}/rest/api/2/search`, useBody: false },
    ];

    let data: any = null;
    let lastError: string = '';

    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying Jira API: ${endpoint.method} ${endpoint.url}`);

        let response: Response;

        if (endpoint.useBody) {
          // POST with body
          response = await fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              jql: jql,
              maxResults: 15,
              fields: ['summary', 'status', 'issuetype', 'priority', 'assignee', 'description', 'created', 'updated'],
            }),
          });
        } else {
          // GET with query params
          const queryUrl = `${endpoint.url}?jql=${encodeURIComponent(jql)}&maxResults=15&fields=summary,status,issuetype,priority,assignee,description,created,updated`;
          response = await fetch(queryUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/json',
            },
          });
        }

        console.log(`Jira API response status: ${response.status}`);

        if (response.ok) {
          data = await response.json();
          console.log(`Jira API success - total: ${data.total}, issues: ${data.issues?.length || 0}`);
          break; // Success, exit loop
        } else {
          const errorText = await response.text();
          lastError = `${response.status}: ${errorText.substring(0, 200)}`;
          console.log(`Jira API failed: ${lastError}`);
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        console.log(`Jira API error: ${lastError}`);
      }
    }

    if (!data) {
      console.error('All Jira API endpoints failed. Last error:', lastError);
      return [];
    }

    console.log('Jira response - total:', data.total, 'issues:', data.issues?.length || 0);

    if (!data.issues || data.issues.length === 0) {
      return [];
    }

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

// Extract plain text from Jira ADF
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

// Build context from documents
function buildContext(
  relevantPages: { id: string; title: string; url: string; snippet: string; score: number }[],
  contents: Map<string, string>
): string {
  if (relevantPages.length === 0) {
    return '관련 문서를 찾을 수 없습니다.';
  }

  let context = '## 관련 Confluence 문서\n\n';

  for (const page of relevantPages) {
    const fullContent = contents.get(page.id) || page.snippet;
    const maxLength = page.score > 30 ? 2000 : 1500;
    const truncatedContent = fullContent.length > maxLength
      ? fullContent.substring(0, maxLength) + '...'
      : fullContent;

    context += `### ${page.title}\nURL: ${page.url}\n\n${truncatedContent}\n\n---\n\n`;
  }

  return context;
}

// Build Jira context
function buildJiraContext(issues: JiraIssue[]): string {
  if (issues.length === 0) {
    return '';
  }

  let context = '\n\n## Jira 이슈 정보\n\n';

  for (const issue of issues) {
    context += `### ${issue.key}: ${issue.summary}\n`;
    context += `- **상태**: ${issue.status}\n`;
    context += `- **유형**: ${issue.type}\n`;
    context += `- **우선순위**: ${issue.priority}\n`;
    context += `- **담당자**: ${issue.assignee || '미지정'}\n`;
    context += `- **URL**: ${issue.url}\n`;
    if (issue.description) {
      context += `- **설명**: ${issue.description.substring(0, 300)}${issue.description.length > 300 ? '...' : ''}\n`;
    }
    context += '\n';
  }

  return context;
}

// System prompt
const SYSTEM_PROMPT = `당신은 AEGIS 게임 개발 프로젝트의 AI 어시스턴트입니다.
사용자의 질문에 대해 제공된 Confluence 문서와 Jira 정보를 바탕으로 정확하고 도움이 되는 답변을 제공합니다.

답변 시 다음 지침을 따르세요:
1. 제공된 문서/이슈 내용만을 기반으로 답변하세요.
2. 문서를 언급할 때는 제목과 URL을 함께 제공하세요.
3. Jira 티켓은 "AEGIS-숫자" 형식으로 표시하세요.
4. 정보가 없으면 "검색 결과에서 해당 정보를 찾을 수 없습니다"라고 답변하세요.
5. 한국어로 친절하게 답변하세요.
6. 답변은 간결하되 핵심 정보를 포함하세요.
7. Jira 이슈 목록은 테이블이나 목록 형식으로 정리하세요.`;

// Main query processor
export async function processQuery(query: string): Promise<ChatResponse> {
  const aiProvider = process.env.AI_PROVIDER || 'gemini';

  console.log('Processing query:', query);
  console.log('Is Jira related:', isJiraRelatedQuery(query));

  // Load documents
  const { index, contents } = loadDocuments();

  // Search relevant pages (skip if Jira-only query)
  const isJiraOnly = isJiraRelatedQuery(query) && !query.includes('문서') && !query.includes('컨플');
  let relevantPages: { id: string; title: string; url: string; snippet: string; score: number }[] = [];
  
  if (!isJiraOnly) {
    relevantPages = searchRelevantPages(query, index, contents);
  }

  // Build context
  let context = '';
  
  // Search Jira if relevant
  let jiraIssues: JiraIssue[] = [];
  if (isJiraRelatedQuery(query)) {
    console.log('Searching Jira...');
    jiraIssues = await searchJiraIssues(query);
    console.log('Found', jiraIssues.length, 'Jira issues');
  }

  if (isJiraOnly && jiraIssues.length > 0) {
    context = buildJiraContext(jiraIssues);
  } else {
    context = buildContext(relevantPages, contents);
    context += buildJiraContext(jiraIssues);
  }

  // Build sources list
  const sources: SourceItem[] = [
    ...relevantPages.map(p => ({
      type: 'confluence' as const,
      title: p.title,
      url: p.url,
      score: p.score,
    })),
    ...jiraIssues.map(issue => ({
      type: 'jira' as const,
      title: `${issue.key}: ${issue.summary}`,
      url: issue.url,
    })),
  ];

  // Build user message
  const userMessage = `## 사용자 질문
${query}

${context}

위 문서와 이슈 정보를 참고하여 사용자의 질문에 답변해주세요.`;

  let responseContent: string;

  try {
    if (aiProvider === 'claude') {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const textContent = response.content.find((block) => block.type === 'text');
      responseContent = textContent?.type === 'text' ? textContent.text : '응답을 생성할 수 없습니다.';
    } else {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: SYSTEM_PROMPT,
      });

      const result = await model.generateContent(userMessage);
      responseContent = result.response.text() || '응답을 생성할 수 없습니다.';
    }
  } catch (error) {
    console.error('AI API error:', error);
    responseContent = '죄송합니다. AI 응답을 생성하는 중 오류가 발생했습니다.';
  }

  return {
    content: responseContent,
    sources,
  };
}
