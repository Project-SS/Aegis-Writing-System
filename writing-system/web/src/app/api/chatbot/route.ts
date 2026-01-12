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
  dueDate?: string;
  labels?: string[];
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

// Check if the query is specifically asking for Confluence documents
function isConfluenceOnlyQuery(query: string): boolean {
  const confluenceOnlyPatterns = [
    /^컨플\s*$/i,
    /^컨플루언스\s*$/i,
    /^confluence\s*$/i,
    /^컨플\s*(문서|페이지)?\s*(목록|리스트|보여줘|알려줘|찾아줘)?\s*$/i,
    /^컨플루언스\s*(문서|페이지)?\s*(목록|리스트|보여줘|알려줘|찾아줘)?\s*$/i,
    /^confluence\s*(doc|document|page)?\s*(list|show)?\s*$/i,
    /^(최근|전체|모든)\s*(컨플|컨플루언스|confluence)\s*(문서|페이지)?\s*$/i,
    /^(컨플|컨플루언스|confluence)\s*(최근|전체|모든)?\s*(문서|페이지)?\s*(뭐|뭐가|어떤)?\s*(있|있어|있나|있니)?\s*$/i,
  ];
  
  return confluenceOnlyPatterns.some(pattern => pattern.test(query.trim()));
}

// Check if the query mentions Confluence (for search context)
function isConfluenceRelatedQuery(query: string): boolean {
  const confluenceKeywords = [
    '컨플', '컨플루언스', 'confluence', '문서', 'document', 'doc', '페이지', 'page', '위키', 'wiki',
  ];
  
  const queryLower = query.toLowerCase();
  return confluenceKeywords.some(keyword => queryLower.includes(keyword));
}

// Extract Confluence search terms from query
function extractConfluenceSearchTerms(query: string): {
  text?: string;
  listAll?: boolean;
} {
  const result: {
    text?: string;
    listAll?: boolean;
  } = {};
  
  // Check if query is just asking for Confluence documents without specific search terms
  if (isConfluenceOnlyQuery(query)) {
    result.listAll = true;
    return result;
  }
  
  // Extract search text (remove common query words)
  const removeWords = [
    '컨플', '컨플루언스', 'confluence', '문서', 'document', 'doc', '페이지', 'page', '위키', 'wiki',
    '찾아줘', '찾아', '검색', '보여줘', '알려줘', '목록', '리스트',
    '관련', '있는', '모든', '전체', '최근', '뭐', '뭐가', '어떤',
  ];
  
  let searchText = query;
  for (const word of removeWords) {
    searchText = searchText.replace(new RegExp(word, 'gi'), '');
  }
  searchText = searchText.replace(/\s+/g, ' ').trim();
  
  if (searchText.length > 1) {
    result.text = searchText;
  } else {
    result.listAll = true;
  }
  
  return result;
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

// Check if the query is ONLY about Jira (should skip Confluence search)
function isJiraOnlyQuery(query: string): boolean {
  const jiraExclusiveKeywords = [
    '지라', 'jira', '일감', '티켓', 'ticket',
  ];
  
  const queryLower = query.toLowerCase();
  const hasJiraKeyword = jiraExclusiveKeywords.some(keyword => queryLower.includes(keyword));
  
  // Also check for assignee patterns (e.g., "이래관의 일감", "신동효님 담당")
  const assigneePatterns = [
    /[가-힣]{2,4}(?:님)?의?\s*(?:일감|이슈|티켓|작업)/,
    /[가-힣]{2,4}(?:님|씨)?\s*담당/,
    /담당(?:자)?[:\s]+[가-힣]{2,4}/,
  ];
  const hasAssigneePattern = assigneePatterns.some(pattern => pattern.test(query));
  
  return hasJiraKeyword || hasAssigneePattern;
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
    // Get assignable users for the project
    const url = `${baseUrl}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=1000`;
    
    console.log('Fetching project assignees...');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch assignees:', response.status);
      return [];
    }

    const users = await response.json();
    console.log('Fetched', users.length, 'assignable users');
    
    // Parse users and extract Korean names from displayName
    // Format: "Raekwan Lee (이래관)" or "이래관" or "Raekwan Lee"
    const parsedUsers = users.map((user: any) => {
      const displayName = user.displayName || '';
      let koreanName: string | undefined;
      
      // Extract Korean name from parentheses: "Raekwan Lee (이래관)"
      const koreanMatch = displayName.match(/\(([가-힣]+)\)/);
      if (koreanMatch) {
        koreanName = koreanMatch[1];
      } else if (/^[가-힣]+$/.test(displayName)) {
        // displayName is entirely Korean
        koreanName = displayName;
      }
      
      return {
        accountId: user.accountId,
        displayName: displayName,
        koreanName: koreanName,
      };
    });
    
    // Cache the results
    projectAssigneesCache = parsedUsers;
    assigneesCacheTime = Date.now();
    
    return parsedUsers;
  } catch (error) {
    console.error('Error fetching project assignees:', error);
    return [];
  }
}

// Search Jira users by name (to find accountId for Korean names)
async function findJiraUserByName(
  searchName: string,
  baseUrl: string,
  projectKey: string,
  credentials: string
): Promise<string | null> {
  try {
    console.log('Searching for user:', searchName);
    
    // First, try to find from project assignees (supports Korean names)
    const assignees = await getProjectAssignees(baseUrl, projectKey, credentials);
    
    // Search by Korean name first
    for (const user of assignees) {
      if (user.koreanName === searchName) {
        console.log('Found by Korean name:', user.displayName, 'accountId:', user.accountId);
        return user.accountId;
      }
    }
    
    // Search by displayName containing the search term
    for (const user of assignees) {
      if (user.displayName.includes(searchName) || 
          user.displayName.toLowerCase().includes(searchName.toLowerCase())) {
        console.log('Found by displayName:', user.displayName, 'accountId:', user.accountId);
        return user.accountId;
      }
    }
    
    // Fallback: try Jira user search API (may not work well with Korean)
    const searchUrl = `${baseUrl}/rest/api/3/user/search?query=${encodeURIComponent(searchName)}&maxResults=10`;
    
    const response = await fetch(searchUrl, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const users = await response.json();
      if (users.length > 0) {
        // Check if any user's displayName contains the search name
        for (const user of users) {
          const displayName = user.displayName || '';
          if (displayName.includes(searchName)) {
            console.log('Found via API:', displayName, 'accountId:', user.accountId);
            return user.accountId;
          }
        }
        // Return first result as fallback
        console.log('Using first API result:', users[0].displayName);
        return users[0].accountId;
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
  
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    // Extract search terms from query
    const searchTerms = extractJiraSearchTerms(query);
    
    // Build JQL query
    let jql = `project = ${projectKey}`;
    
    // If specific issue key is requested
    if (searchTerms.issueKey) {
      jql = `key = "${searchTerms.issueKey}"`;
    } else {
      // Add text search if provided (only if it's meaningful - at least 2 chars and not just particles)
      if (searchTerms.text && searchTerms.text.length >= 2) {
        // Filter out common meaningless fragments
        const meaninglessPatterns = /^(모두|전체|해줘|보여|찾아|검색|목록|리스트|래관|동효)$/;
        if (!meaninglessPatterns.test(searchTerms.text)) {
          jql += ` AND (summary ~ "${searchTerms.text}" OR description ~ "${searchTerms.text}")`;
        }
      }
      // Add status filter if provided
      if (searchTerms.status) {
        jql += ` AND status = "${searchTerms.status}"`;
      }
      // Add type filter if provided
      if (searchTerms.type) {
        jql += ` AND issuetype = "${searchTerms.type}"`;
      }
      // Add assignee filter if provided
      if (searchTerms.assignee) {
        // Jira displayName format: "Raekwan Lee (이래관)"
        // First, try to find the user's accountId by searching for their name
        const accountId = await findJiraUserByName(searchTerms.assignee, baseUrl, projectKey, credentials);
        
        if (accountId) {
          // Use accountId for exact matching
          jql += ` AND assignee = "${accountId}"`;
          console.log('Using accountId for assignee:', accountId);
        } else {
          // Fallback: try text search on assignee field
          console.log('Assignee not found, using text search');
          jql += ` AND assignee ~ "${searchTerms.assignee}"`;
        }
      }
      // Add priority filter if provided
      if (searchTerms.priority) {
        jql += ` AND priority = "${searchTerms.priority}"`;
      }
      // Add sprint filter if provided
      if (searchTerms.sprint) {
        if (searchTerms.sprint === 'active') {
          jql += ` AND sprint in openSprints()`;
        } else if (searchTerms.sprint === 'future') {
          jql += ` AND sprint in futureSprints()`;
        } else {
          jql += ` AND sprint = "${searchTerms.sprint}"`;
        }
      }
      // Add labels filter if provided
      if (searchTerms.labels && searchTerms.labels.length > 0) {
        const labelConditions = searchTerms.labels.map(l => `labels = "${l}"`).join(' OR ');
        jql += ` AND (${labelConditions})`;
      }
      // Add due date filter if provided
      if (searchTerms.dueDateRange) {
        if (searchTerms.dueDateRange.start && searchTerms.dueDateRange.end) {
          jql += ` AND duedate >= "${searchTerms.dueDateRange.start}" AND duedate <= "${searchTerms.dueDateRange.end}"`;
        } else if (searchTerms.dueDateRange.end) {
          jql += ` AND duedate <= "${searchTerms.dueDateRange.end}"`;
        } else if (searchTerms.dueDateRange.start) {
          jql += ` AND duedate >= "${searchTerms.dueDateRange.start}"`;
        }
      }
      // Add created date filter if provided
      if (searchTerms.createdDateRange) {
        if (searchTerms.createdDateRange.start && searchTerms.createdDateRange.end) {
          jql += ` AND created >= "${searchTerms.createdDateRange.start}" AND created <= "${searchTerms.createdDateRange.end}"`;
        } else if (searchTerms.createdDateRange.start) {
          jql += ` AND created >= "${searchTerms.createdDateRange.start}"`;
        }
      }
    }
    
    jql += ' ORDER BY updated DESC';
    
    // Increase max results if listing all or searching
    const maxResults = searchTerms.listAll ? 20 : 25;
    
    // Use the new Jira search API endpoint (POST /rest/api/3/search/jql)
    const url = `${baseUrl}/rest/api/3/search/jql`;
    
    console.log('Jira search JQL:', jql);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        jql: jql,
        maxResults: maxResults,
        fields: ['summary', 'status', 'issuetype', 'priority', 'assignee', 'description', 'created', 'updated', 'duedate', 'labels'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Jira API error:', response.status, errorText);
      
      // Fallback to old API if new one fails
      console.log('Trying fallback to old Jira API...');
      const fallbackUrl = `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,issuetype,priority,assignee,description,created,updated,duedate,labels`;
      const fallbackResponse = await fetch(fallbackUrl, {
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
      
      if (!fallbackResponse.ok) {
        console.error('Jira fallback API error:', fallbackResponse.status);
        return [];
      }
      
      const fallbackData = await fallbackResponse.json();
      return fallbackData.issues.map((issue: any) => ({
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
        dueDate: issue.fields.duedate || undefined,
        labels: issue.fields.labels || [],
        url: `${baseUrl}/browse/${issue.key}`,
      }));
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
      dueDate: issue.fields.duedate || undefined,
      labels: issue.fields.labels || [],
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
  listAll?: boolean;
  assignee?: string;
  priority?: string;
  sprint?: string;
  labels?: string[];
  dueDateRange?: { start?: string; end?: string };
  createdDateRange?: { start?: string; end?: string };
} {
  const result: {
    text?: string;
    status?: string;
    type?: string;
    issueKey?: string;
    listAll?: boolean;
    assignee?: string;
    priority?: string;
    sprint?: string;
    labels?: string[];
    dueDateRange?: { start?: string; end?: string };
    createdDateRange?: { start?: string; end?: string };
  } = {};
  
  // Check for specific issue key (e.g., AEGIS-123)
  const issueKeyMatch = query.match(/([A-Z]{2,10}-\d{1,6})/);
  if (issueKeyMatch) {
    result.issueKey = issueKeyMatch[1];
    return result;
  }
  
  const queryLower = query.toLowerCase();
  
  // Extract assignee (담당자)
  // Patterns: "신동효님의 일감", "신동효 담당", "담당자 신동효", "assignee:신동효", "이래관의 일감"
  const assigneePatterns = [
    // "이래관의 일감", "신동효님의 일감" - 이름 + 의/님의 + 일감/이슈
    /([가-힣]{2,4})(?:님)?의\s*(?:일감|이슈|티켓|작업)/,
    // "신동효님 일감", "이래관 일감" - 이름 + 님/공백 + 일감/이슈
    /([가-힣]{2,4})(?:님)?\s+(?:일감|이슈|티켓|작업)/,
    // "신동효 담당", "이래관 담당자" - 이름 + 담당
    /([가-힣]{2,4})(?:님|씨)?\s*담당/,
    // "담당자 신동효", "담당자: 이래관" - 담당자 + 이름
    /담당(?:자)?[:\s]+([가-힣]{2,4})/,
    // "assignee:신동효", "assignee: 이래관"
    /assignee[:\s]*([가-힣a-zA-Z]+)/i,
    // "신동효에게 할당", "이래관한테 배정"
    /([가-힣]{2,4})(?:님|씨)?\s*(?:에게|한테)\s*(?:할당|배정)/,
    // 영문 이름: "John의 일감", "John 담당"
    /([a-zA-Z]+)(?:'s)?\s*(?:일감|이슈|티켓|tasks?|issues?)/i,
  ];
  
  for (const pattern of assigneePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      // Remove honorifics and particles
      let assigneeName = match[1].replace(/님|씨|의$/g, '').trim();
      if (assigneeName.length >= 2) {
        result.assignee = assigneeName;
        console.log('Extracted assignee:', result.assignee);
        break;
      }
    }
  }
  
  // Extract priority (우선순위)
  const priorityMap: { [key: string]: string } = {
    '최상': 'Highest',
    '높음': 'High',
    '높은': 'High',
    '중간': 'Medium',
    '보통': 'Medium',
    '낮음': 'Low',
    '낮은': 'Low',
    '최하': 'Lowest',
    'highest': 'Highest',
    'high': 'High',
    'medium': 'Medium',
    'low': 'Low',
    'lowest': 'Lowest',
    '긴급': 'Highest',
    '급한': 'High',
    'critical': 'Highest',
    'blocker': 'Highest',
  };
  
  for (const [keyword, priority] of Object.entries(priorityMap)) {
    if (queryLower.includes(keyword)) {
      result.priority = priority;
      break;
    }
  }
  
  // Extract sprint
  const sprintPatterns = [
    /스프린트[:\s]*(\d+)/,
    /sprint[:\s]*(\d+)/i,
    /(\d+)\s*(?:차|번째)?\s*스프린트/,
    /현재\s*스프린트/,
    /이번\s*스프린트/,
    /다음\s*스프린트/,
  ];
  
  for (const pattern of sprintPatterns) {
    const match = query.match(pattern);
    if (match) {
      if (match[1]) {
        result.sprint = match[1];
      } else if (queryLower.includes('현재') || queryLower.includes('이번')) {
        result.sprint = 'active';
      } else if (queryLower.includes('다음')) {
        result.sprint = 'future';
      }
      break;
    }
  }
  
  // Extract labels (레이블)
  const labelPatterns = [
    /레이블[:\s]*([가-힣a-zA-Z0-9_-]+)/g,
    /label[:\s]*([가-힣a-zA-Z0-9_-]+)/gi,
    /태그[:\s]*([가-힣a-zA-Z0-9_-]+)/g,
  ];
  
  const labels: string[] = [];
  for (const pattern of labelPatterns) {
    let match;
    while ((match = pattern.exec(query)) !== null) {
      if (match[1]) {
        labels.push(match[1]);
      }
    }
  }
  if (labels.length > 0) {
    result.labels = labels;
  }
  
  // Extract date ranges (기한, 시작일, 생성일)
  const today = new Date();
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  // Due date patterns
  if (queryLower.includes('오늘 마감') || queryLower.includes('오늘까지')) {
    result.dueDateRange = { end: formatDate(today) };
  } else if (queryLower.includes('이번 주') || queryLower.includes('이번주')) {
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (7 - today.getDay()));
    result.dueDateRange = { start: formatDate(today), end: formatDate(endOfWeek) };
  } else if (queryLower.includes('이번 달') || queryLower.includes('이번달')) {
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    result.dueDateRange = { start: formatDate(today), end: formatDate(endOfMonth) };
  } else if (queryLower.includes('기한 지난') || queryLower.includes('마감 지난') || queryLower.includes('overdue')) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    result.dueDateRange = { end: formatDate(yesterday) };
  }
  
  // Created date patterns
  if (queryLower.includes('오늘 생성') || queryLower.includes('오늘 만든')) {
    result.createdDateRange = { start: formatDate(today), end: formatDate(today) };
  } else if (queryLower.includes('최근 일주일') || queryLower.includes('지난 주')) {
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    result.createdDateRange = { start: formatDate(weekAgo) };
  } else if (queryLower.includes('최근 한달') || queryLower.includes('지난 달')) {
    const monthAgo = new Date(today);
    monthAgo.setMonth(today.getMonth() - 1);
    result.createdDateRange = { start: formatDate(monthAgo) };
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
    '열림': 'Open',
    'open': 'Open',
    '닫힘': 'Closed',
    'closed': 'Closed',
  };
  
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
    '작업': 'Task',
    '스토리': 'Story',
    'story': 'Story',
    '에픽': 'Epic',
    'epic': 'Epic',
    '하위작업': 'Sub-task',
    'subtask': 'Sub-task',
    'sub-task': 'Sub-task',
  };
  
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (queryLower.includes(keyword)) {
      result.type = type;
      break;
    }
  }
  
  // Extract search text (remove common query words and extracted terms)
  const removeWords = [
    '지라', 'jira', '이슈', 'issue', '티켓', 'ticket', '일감',
    '찾아줘', '찾아', '검색', '보여줘', '알려줘', '목록', '리스트',
    '진행중', '진행 중', '완료', '대기', '할일', '할 일',
    '버그', 'bug', '태스크', 'task', '스토리', 'story', '에픽', 'epic',
    '관련', '있는', '모든', '전체', '최근', '뭐', '뭐가', '어떤',
    '작업', '하위작업', 'subtask', 'sub-task',
    '열림', 'open', '닫힘', 'closed',
    '담당자', '담당', 'assignee', '님의', '님', '씨의', '씨',
    '우선순위', 'priority', '높음', '낮음', '중간', '긴급',
    '스프린트', 'sprint', '현재', '이번', '다음',
    '레이블', 'label', '태그',
    '기한', '마감', '시작일', '생성일', 'due', 'created',
    '오늘', '이번주', '이번 주', '이번달', '이번 달', '지난', '최근',
    // Additional common words and particles
    '에서', '에게', '한테', '의', '을', '를', '이', '가', '은', '는',
    '해줘', '해주세요', '줘', '주세요', '알려', '보여', '찾아봐',
    '어디', '누구', '무엇', '언제', '어떻게', '왜',
  ];
  
  // Also remove the assignee name if found (with variations)
  if (result.assignee) {
    removeWords.push(result.assignee);
    removeWords.push(result.assignee + '의');
    removeWords.push(result.assignee + '님');
    removeWords.push(result.assignee + '님의');
  }
  
  let searchText = query;
  for (const word of removeWords) {
    searchText = searchText.replace(new RegExp(word, 'gi'), '');
  }
  // Remove remaining Korean particles and common endings
  searchText = searchText.replace(/[을를이가은는의에서에게한테로으로]/g, ' ');
  searchText = searchText.replace(/\s+/g, ' ').trim();
  
  // Check if query is just asking for Jira issues without specific search terms
  const jiraOnlyPatterns = [
    /^지라\s*$/i,
    /^jira\s*$/i,
    /^지라\s*(이슈|티켓|일감)?\s*(목록|리스트|보여줘|알려줘|찾아줘)?\s*$/i,
    /^jira\s*(issue|ticket)?\s*(list|show)?\s*$/i,
    /^(최근|전체|모든)\s*(지라|jira)\s*(이슈|티켓|일감)?\s*$/i,
    /^(지라|jira)\s*(최근|전체|모든)?\s*(이슈|티켓|일감)?\s*(뭐|뭐가|어떤)?\s*(있|있어|있나|있니)?\s*$/i,
  ];
  
  if (jiraOnlyPatterns.some(pattern => pattern.test(query.trim()))) {
    result.listAll = true;
    return result;
  }
  
  // Check if we have any filters set
  const hasFilters = result.assignee || result.priority || result.sprint || 
                     result.labels || result.dueDateRange || result.createdDateRange ||
                     result.status || result.type;
  
  if (searchText.length > 1) {
    result.text = searchText;
  } else if (!hasFilters) {
    // If no specific filters and no search text, list recent issues
    result.listAll = true;
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
    if (issue.dueDate) {
      context += `- **기한**: ${new Date(issue.dueDate).toLocaleDateString('ko-KR')}\n`;
    }
    if (issue.labels && issue.labels.length > 0) {
      context += `- **레이블**: ${issue.labels.join(', ')}\n`;
    }
    context += `- **생성일**: ${new Date(issue.created).toLocaleDateString('ko-KR')}\n`;
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
  
  // Check if this is a Confluence-only query (e.g., "컨플", "컨플루언스", "confluence")
  const confluenceTerms = extractConfluenceSearchTerms(query);
  
  // If listing all documents, return recent documents sorted by title
  if (confluenceTerms.listAll && !confluenceTerms.text) {
    console.log('Confluence list all query detected, returning all documents');
    const { baseUrl, spaceKey } = loadConfluenceConfig();
    
    return index.pages.slice(0, maxResults).map(page => {
      const content = contents.get(page.id) || '';
      const snippet = content.substring(0, 200).replace(/\n+/g, ' ').trim() + '...';
      
      return {
        id: page.id,
        title: page.title,
        url: page.url || generatePageUrl(page.id, baseUrl, spaceKey),
        snippet,
        score: 100, // All documents get same score when listing all
        matchDetails: {
          titleMatch: 0,
          contentMatch: 0,
          tfidfScore: 0,
          synonymMatch: 0,
          semanticScore: 0,
        },
      };
    });
  }
  
  // Use extracted search text if available, otherwise use original query
  const searchQuery = confluenceTerms.text || query;

  // If search engine is not initialized, fall back to basic search
  if (stats.documentCount === 0) {
    console.log('Search engine not initialized, using basic search');
    return basicSearch(searchQuery, index, contents, maxResults);
  }

  // Use advanced search engine
  const results = searchEngine.search(searchQuery, maxResults);
  
  console.log(`Advanced search for "${searchQuery}" found ${results.length} results`);
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

  let context = '## 관련 Confluence 문서\n\n';
  context += '**중요 지침**: 답변에서 아래 문서를 언급할 때는 반드시 제공된 마크다운 링크 형식을 그대로 사용하세요.\n\n';
  context += '### 사용 가능한 문서 링크:\n';
  
  // Provide document links for AI to use
  for (const page of relevantPages.slice(0, 10)) { // Top 10 most relevant
    context += `- [${page.title}](${page.url})\n`;
  }
  context += '\n';
  
  context += '### 문서 내용:\n\n';
  
  for (const page of relevantPages) {
    const fullContent = contents.get(page.id) || page.snippet;
    // Limit content length per page - give more content to higher scored documents
    const maxLength = page.score > 30 ? 3000 : 2000;
    const truncatedContent = fullContent.length > maxLength 
      ? fullContent.substring(0, maxLength) + '...'
      : fullContent;
    
    context += `#### [${page.title}](${page.url}) (관련도: ${page.score.toFixed(1)})\n\n`;
    context += `${truncatedContent}\n\n---\n\n`;
  }

  return context;
}

const systemPrompt = `당신은 AEGIS 게임 개발 프로젝트의 AI 어시스턴트입니다.
사용자의 질문에 대해 제공된 Confluence 문서와 Jira 정보를 바탕으로 정확하고 도움이 되는 답변을 제공합니다.

답변 시 다음 지침을 반드시 따르세요:
1. **제공된 정보만 사용**: 제공된 문서/이슈 내용만을 기반으로 답변하세요.
2. **Jira 이슈 질문**: 사용자가 Jira 이슈, 일감, 티켓에 대해 질문하면 제공된 Jira 이슈 정보만 사용하여 답변하세요. Confluence 문서를 참조하지 마세요.
3. **Confluence 문서 질문**: 사용자가 문서, 설계, 기획에 대해 질문하면 Confluence 문서를 참조하세요.
4. **문서 링크 삽입**: Confluence 문서를 언급할 때는 제공된 마크다운 링크 형식을 사용하세요.
   - 예시: "[봇의 사격 판단](URL) 문서에 따르면..."
5. **Jira 티켓 형식**: Jira 티켓 ID는 "AEGIS-숫자" 형식(예: AEGIS-514)만 사용하세요.
6. **정보 없음 처리**: 제공된 정보에 없는 내용은 "검색 결과에서 해당 정보를 찾을 수 없습니다"라고 답변하세요.
7. 한국어로 친절하게 답변하세요.
8. 마크다운 형식을 활용하여 가독성 좋게 답변하세요:
   - 제목에는 ## 또는 ### 사용
   - 목록에는 - 또는 1. 2. 3. 사용
   - 중요한 내용은 **굵게** 표시
   - Jira 이슈 목록은 테이블 형식으로 정리하면 좋습니다`;

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

    // Check if this is a Jira-only query (skip Confluence search)
    const jiraOnly = isJiraOnlyQuery(message);
    
    // Load cached pages and initialize search engine
    const { index, contents } = loadAndIndexDocuments();

    // Search relevant pages using advanced search (skip if Jira-only query)
    let relevantPages: { id: string; title: string; url: string; snippet: string; score: number; matchDetails?: SearchResult['matchDetails'] }[] = [];
    if (!jiraOnly) {
      relevantPages = searchRelevantPages(message, index, contents);
    } else {
      console.log('Jira-only query detected, skipping Confluence search');
    }

    // Build context
    let context = '';
    
    // Check if query is Jira-related and search Jira
    let jiraIssues: JiraIssue[] = [];
    if (isJiraRelatedQuery(message) || jiraOnly) {
      console.log('Searching Jira...');
      jiraIssues = await searchJiraIssues(message, jiraAuth);
      console.log(`Found ${jiraIssues.length} Jira issues`);
      
      // For Jira-only queries, only use Jira context
      if (jiraOnly) {
        context = buildJiraContext(jiraIssues);
        if (jiraIssues.length === 0) {
          context = '검색된 Jira 이슈가 없습니다. 검색 조건을 확인해주세요.\n\n';
        }
      } else {
        // Mixed query: include both Confluence and Jira
        context = buildContext(relevantPages, contents);
        context += buildJiraContext(jiraIssues);
      }
    } else {
      // Confluence-only query
      context = buildContext(relevantPages, contents);
    }

    // Get API key from request or environment
    const effectiveApiKey = apiKey || (provider === 'claude' ? process.env.ANTHROPIC_API_KEY : process.env.GEMINI_API_KEY);
    const effectiveProvider = provider || (process.env.ANTHROPIC_API_KEY ? 'claude' : 'gemini');

    // Build sources list (Confluence + Jira) with match details
    const sources: { 
      type: 'confluence' | 'jira'; 
      title: string; 
      url: string;
      score?: number;
      matchType?: 'title' | 'content';
    }[] = [];
    
    // Only include Confluence results if not a Jira-only query
    if (!jiraOnly && relevantPages.length > 0) {
      // Sort by score (highest first) and separate by match type
      const sortedPages = [...relevantPages].sort((a, b) => b.score - a.score);
      
      // Categorize by match type
      const titleMatches = sortedPages.filter(p => 
        p.matchDetails?.titleMatch && p.matchDetails.titleMatch > 0
      );
      const contentOnlyMatches = sortedPages.filter(p => 
        !p.matchDetails?.titleMatch || p.matchDetails.titleMatch === 0
      );
      
      // Title matches first (sorted by score)
      sources.push(...titleMatches.map(p => ({
        type: 'confluence' as const,
        title: p.title,
        url: p.url,
        score: p.score,
        matchType: 'title' as const,
      })));
      
      // Content-only matches (sorted by score)
      sources.push(...contentOnlyMatches.map(p => ({
        type: 'confluence' as const,
        title: p.title,
        url: p.url,
        score: p.score,
        matchType: 'content' as const,
      })));
    }
    
    // Always include Jira issues
    sources.push(...jiraIssues.map(issue => ({
      type: 'jira' as const,
      title: `${issue.key}: ${issue.summary}`,
      url: issue.url,
      score: undefined,
      matchType: undefined,
    })));

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
