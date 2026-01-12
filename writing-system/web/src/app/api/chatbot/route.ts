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

interface JiraSprint {
  id: number;
  name: string;
  state: 'active' | 'future' | 'closed';
  startDate?: string;
  endDate?: string;
  goal?: string;
  boardId?: number;
}

interface JiraVersion {
  id: string;
  name: string;
  description?: string;
  released: boolean;
  archived: boolean;
  releaseDate?: string;
  startDate?: string;
  overdue?: boolean;
  projectId: number;
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
    // Try multiple API endpoints for different Jira configurations
    const endpoints = [
      `${baseUrl}/rest/api/3/user/assignable/search?project=${projectKey}&maxResults=1000`,
      `${baseUrl}/rest/api/2/user/assignable/search?project=${projectKey}&maxResults=1000`,
      `${baseUrl}/rest/api/3/user/search?maxResults=1000`,
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
        users = await response.json();
        console.log('Fetched', users.length, 'users from', url);
        break;
      } else {
        console.log('Endpoint failed:', url, response.status);
      }
    }
    
    if (users.length === 0) {
      console.log('No users found from any endpoint');
      return [];
    }
    
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

// Get active sprints for a board
async function getActiveSprints(
  jiraAuth?: ChatRequest['jiraAuth']
): Promise<JiraSprint[]> {
  const baseUrl = jiraAuth?.baseUrl || process.env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL;
  const email = jiraAuth?.email || process.env.JIRA_EMAIL;
  const apiToken = jiraAuth?.apiToken || process.env.JIRA_API_TOKEN;

  if (!email || !apiToken) {
    console.log('Jira credentials not configured for sprint fetch');
    return [];
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    // First, get all boards for the project
    const boardsUrl = `${baseUrl}/rest/agile/1.0/board?projectKeyOrId=${jiraAuth?.projectKey || process.env.JIRA_PROJECT_KEY || DEFAULT_JIRA_PROJECT_KEY}&maxResults=10`;
    console.log('Fetching boards from:', boardsUrl);
    
    const boardsResponse = await fetch(boardsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    });

    if (!boardsResponse.ok) {
      console.log('Failed to fetch boards:', boardsResponse.status);
      return [];
    }

    const boardsData = await boardsResponse.json();
    const boards = boardsData.values || [];
    
    if (boards.length === 0) {
      console.log('No boards found for project');
      return [];
    }

    console.log('Found boards:', boards.map((b: any) => `${b.id}: ${b.name}`).join(', '));

    // Get sprints from the first Scrum board
    const scrumBoard = boards.find((b: any) => b.type === 'scrum') || boards[0];
    const boardId = scrumBoard.id;
    
    // Fetch active and future sprints
    const sprintsUrl = `${baseUrl}/rest/agile/1.0/board/${boardId}/sprint?state=active,future&maxResults=10`;
    console.log('Fetching sprints from:', sprintsUrl);
    
    const sprintsResponse = await fetch(sprintsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    });

    if (!sprintsResponse.ok) {
      const errorText = await sprintsResponse.text();
      console.log('Failed to fetch sprints:', sprintsResponse.status, errorText);
      return [];
    }

    const sprintsData = await sprintsResponse.json();
    const sprints: JiraSprint[] = (sprintsData.values || []).map((sprint: any) => ({
      id: sprint.id,
      name: sprint.name,
      state: sprint.state,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      goal: sprint.goal,
      boardId: boardId,
    }));

    console.log('Found sprints:', sprints.map(s => `${s.name} (${s.state})`).join(', '));
    return sprints;
  } catch (error) {
    console.error('Error fetching sprints:', error);
    return [];
  }
}

// Check if query is asking for sprint information
function isSprintInfoQuery(query: string): boolean {
  const sprintInfoPatterns = [
    /스프린트\s*(정보|현황|상태|목표|기간)/,
    /스프린트\s*\d+/,  // "스프린트5", "스프린트 5"
    /현재\s*스프린트/,
    /진행\s*중(인|인\s*)?\s*스프린트/,
    /이번\s*스프린트/,
    /sprint\s*(info|status|goal|\d+)/i,
    /current\s*sprint/i,
    /active\s*sprint/i,
  ];
  
  return sprintInfoPatterns.some(pattern => pattern.test(query));
}

// Build sprint context for AI
function buildSprintContext(sprints: JiraSprint[]): string {
  if (sprints.length === 0) {
    return '';
  }

  let context = '\n\n## 스프린트 정보\n\n';
  
  const activeSprints = sprints.filter(s => s.state === 'active');
  const futureSprints = sprints.filter(s => s.state === 'future');
  
  if (activeSprints.length > 0) {
    context += '### 진행 중인 스프린트\n\n';
    for (const sprint of activeSprints) {
      context += `**${sprint.name}**\n`;
      if (sprint.startDate) {
        context += `- 시작일: ${new Date(sprint.startDate).toLocaleDateString('ko-KR')}\n`;
      }
      if (sprint.endDate) {
        context += `- 종료일: ${new Date(sprint.endDate).toLocaleDateString('ko-KR')}\n`;
        // Calculate remaining days
        const endDate = new Date(sprint.endDate);
        const today = new Date();
        const remainingDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (remainingDays > 0) {
          context += `- 남은 기간: ${remainingDays}일\n`;
        } else if (remainingDays === 0) {
          context += `- 남은 기간: 오늘 종료\n`;
        }
      }
      if (sprint.goal) {
        context += `- 목표: ${sprint.goal}\n`;
      }
      context += '\n';
    }
  }
  
  if (futureSprints.length > 0) {
    context += '### 예정된 스프린트\n\n';
    for (const sprint of futureSprints) {
      context += `**${sprint.name}**\n`;
      if (sprint.startDate) {
        context += `- 시작 예정일: ${new Date(sprint.startDate).toLocaleDateString('ko-KR')}\n`;
      }
      if (sprint.endDate) {
        context += `- 종료 예정일: ${new Date(sprint.endDate).toLocaleDateString('ko-KR')}\n`;
      }
      if (sprint.goal) {
        context += `- 목표: ${sprint.goal}\n`;
      }
      context += '\n';
    }
  }
  
  return context;
}

// Get project versions (milestones)
async function getProjectVersions(
  jiraAuth?: ChatRequest['jiraAuth']
): Promise<JiraVersion[]> {
  const baseUrl = jiraAuth?.baseUrl || process.env.JIRA_BASE_URL || DEFAULT_JIRA_BASE_URL;
  const projectKey = jiraAuth?.projectKey || process.env.JIRA_PROJECT_KEY || DEFAULT_JIRA_PROJECT_KEY;
  const email = jiraAuth?.email || process.env.JIRA_EMAIL;
  const apiToken = jiraAuth?.apiToken || process.env.JIRA_API_TOKEN;

  if (!email || !apiToken) {
    console.log('Jira credentials not configured for version fetch');
    return [];
  }

  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');

  try {
    // Get project versions
    const versionsUrl = `${baseUrl}/rest/api/3/project/${projectKey}/versions`;
    console.log('Fetching versions from:', versionsUrl);
    
    const response = await fetch(versionsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Failed to fetch versions:', response.status, errorText);
      return [];
    }

    const versions: any[] = await response.json();
    console.log(`Found ${versions.length} versions`);
    
    // Map to our interface and filter out archived versions
    const result: JiraVersion[] = versions
      .filter((v: any) => !v.archived)
      .map((v: any) => ({
        id: v.id,
        name: v.name,
        description: v.description,
        released: v.released || false,
        archived: v.archived || false,
        releaseDate: v.releaseDate,
        startDate: v.startDate,
        overdue: v.overdue,
        projectId: v.projectId,
      }));

    return result;
  } catch (error) {
    console.error('Error fetching versions:', error);
    return [];
  }
}

// Check if query is asking for milestone/version information
function isMilestoneInfoQuery(query: string): boolean {
  const milestonePatterns = [
    /마일스톤/,
    /milestone/i,
    /버전\s*(정보|현황|상태|목록)/,
    /version\s*(info|status|list)/i,
    /릴리스\s*(정보|현황|상태|목록|일정)/,
    /release\s*(info|status|list|schedule)/i,
    /fix\s*version/i,
    /출시\s*(일정|계획|예정)/,
    /배포\s*(일정|계획|예정)/,
  ];
  
  return milestonePatterns.some(pattern => pattern.test(query));
}

// Build milestone/version context for AI
function buildVersionContext(versions: JiraVersion[]): string {
  if (versions.length === 0) {
    return '';
  }

  let context = '\n\n## 마일스톤/버전 정보\n\n';
  
  // Separate by status
  const unreleased = versions.filter(v => !v.released);
  const released = versions.filter(v => v.released);
  
  // Sort unreleased by release date (earliest first)
  unreleased.sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
  });
  
  if (unreleased.length > 0) {
    context += '### 진행 중인 마일스톤 (미출시)\n\n';
    for (const version of unreleased) {
      context += `**${version.name}**`;
      if (version.overdue) {
        context += ' ⚠️ 지연됨';
      }
      context += '\n';
      
      if (version.description) {
        context += `- 설명: ${version.description}\n`;
      }
      if (version.startDate) {
        context += `- 시작일: ${new Date(version.startDate).toLocaleDateString('ko-KR')}\n`;
      }
      if (version.releaseDate) {
        const releaseDate = new Date(version.releaseDate);
        context += `- 출시 예정일: ${releaseDate.toLocaleDateString('ko-KR')}\n`;
        
        // Calculate days until release
        const today = new Date();
        const daysUntil = Math.ceil((releaseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntil > 0) {
          context += `- 출시까지: ${daysUntil}일 남음\n`;
        } else if (daysUntil === 0) {
          context += `- 출시까지: 오늘 출시 예정\n`;
        } else {
          context += `- 출시까지: ${Math.abs(daysUntil)}일 지연\n`;
        }
      }
      context += '\n';
    }
  }
  
  // Show only recent released versions (last 5)
  if (released.length > 0) {
    // Sort by release date (most recent first)
    released.sort((a, b) => {
      if (!a.releaseDate && !b.releaseDate) return 0;
      if (!a.releaseDate) return 1;
      if (!b.releaseDate) return -1;
      return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
    });
    
    const recentReleased = released.slice(0, 5);
    context += '### 최근 출시된 버전\n\n';
    for (const version of recentReleased) {
      context += `**${version.name}** ✅ 출시됨\n`;
      if (version.releaseDate) {
        context += `- 출시일: ${new Date(version.releaseDate).toLocaleDateString('ko-KR')}\n`;
      }
      if (version.description) {
        context += `- 설명: ${version.description}\n`;
      }
      context += '\n';
    }
  }
  
  return context;
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

  console.log('Jira config - baseUrl:', baseUrl, 'projectKey:', projectKey, 'email:', email ? email.substring(0, 5) + '***' : 'NOT SET');

  if (!email || !apiToken) {
    console.log('Jira credentials not configured - email:', !!email, 'apiToken:', !!apiToken);
    return [];
  }
  
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  
  // Debug: Try to fetch available projects to verify connection
  try {
    const projectsUrl = `${baseUrl}/rest/api/3/project/search?maxResults=10`;
    const projectsResponse = await fetch(projectsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    });
    
    if (projectsResponse.ok) {
      const projectsData = await projectsResponse.json();
      const projectKeys = projectsData.values?.map((p: any) => p.key).join(', ') || 'none';
      console.log('Available Jira projects:', projectKeys);
    } else {
      console.log('Failed to fetch projects:', projectsResponse.status);
    }
  } catch (e) {
    console.log('Error fetching projects:', e);
  }

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
          // Escape special characters in search text for JQL
          // Remove or escape quotes and special JQL characters
          const escapedText = searchTerms.text
            .replace(/["'\\]/g, '') // Remove quotes and backslashes
            .replace(/[{}[\]()]/g, '') // Remove brackets
            .trim();
          
          if (escapedText.length >= 2) {
            jql += ` AND (summary ~ "${escapedText}" OR description ~ "${escapedText}")`;
          }
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
          // If user not found, skip assignee filter rather than using broken text search
          // The assignee ~ operator doesn't work well with Korean names in Jira Cloud
          console.log('Assignee not found, skipping assignee filter');
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
        } else if (searchTerms.sprint.startsWith('sprint_')) {
          // For specific sprint number, search in all sprints (open + closed)
          // JQL doesn't support sprint name partial matching, so we use a workaround
          const sprintNum = searchTerms.sprint.replace('sprint_', '');
          // Try to find sprint by name pattern - common patterns: "Sprint 5", "스프린트 5", "5차"
          // Since JQL doesn't support LIKE for sprint names, we search in open sprints first
          jql += ` AND sprint in openSprints()`;
          console.log(`Searching for sprint containing number: ${sprintNum}`);
        } else {
          // Exact sprint name match
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
    
    console.log('Jira search JQL:', jql);
    
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
              maxResults: maxResults,
              fields: ['summary', 'status', 'issuetype', 'priority', 'assignee', 'description', 'created', 'updated', 'duedate', 'labels'],
            }),
          });
        } else {
          // GET with query params
          const queryUrl = `${endpoint.url}?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,status,issuetype,priority,assignee,description,created,updated,duedate,labels`;
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
    
    // Debug: log first issue structure if available
    if (data.issues && data.issues.length > 0) {
      console.log('First issue key:', data.issues[0].key, 'summary:', data.issues[0].fields?.summary?.substring(0, 50));
    }
    
    if (!data.issues || data.issues.length === 0) {
      console.log('No issues found in Jira response');
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
  
  // Common words that should NOT be treated as assignee names
  const notAssigneeWords = new Set([
    '관련', '지라', 'jira', '이슈', '일감', '티켓', '작업', '버그', '태스크',
    '모든', '전체', '최근', '완료', '진행', '대기', '검색', '찾아', '보여',
    '벤치마크', '테스트', '개발', '설계', '기획', '문서', '리뷰',
  ]);
  
  for (const pattern of assigneePatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      // Remove honorifics and particles
      let assigneeName = match[1].replace(/님|씨|의$/g, '').trim();
      // Check if it's a valid name (2-4 chars, not a common word)
      if (assigneeName.length >= 2 && assigneeName.length <= 4 && !notAssigneeWords.has(assigneeName.toLowerCase())) {
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
    /스프린트\s*(\d+)/,
    /sprint\s*(\d+)/i,
    /(\d+)\s*(?:차|번째)?\s*스프린트/,
    /현재\s*스프린트/,
    /이번\s*스프린트/,
    /진행\s*중(인|인\s*)?\s*스프린트/,
    /다음\s*스프린트/,
  ];
  
  for (const pattern of sprintPatterns) {
    const match = query.match(pattern);
    if (match) {
      if (match[1] && /^\d+$/.test(match[1])) {
        // Store sprint number for filtering
        result.sprint = `sprint_${match[1]}`;
        // Also trigger sprint info fetch
        console.log(`Sprint number detected: ${match[1]}`);
      } else if (queryLower.includes('현재') || queryLower.includes('이번') || queryLower.includes('진행')) {
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
    '지라에서', '지라', 'jira', '이슈', 'issue', '티켓', 'ticket', '일감',
    '찾아줘', '찾아', '검색해줘', '검색', '보여줘', '알려줘', '목록', '리스트',
    '진행중인', '진행중', '진행 중', '완료된', '완료', '대기', '할일', '할 일',
    '버그', 'bug', '태스크', 'task', '스토리', 'story', '에픽', 'epic',
    '관련된', '관련', '있는', '모든', '모두', '전체', '최근', '뭐', '뭐가', '어떤',
    '작업', '하위작업', 'subtask', 'sub-task',
    '열림', 'open', '닫힘', 'closed',
    '담당자', '담당', 'assignee', '님의', '님', '씨의', '씨',
    '우선순위', 'priority', '높음', '낮음', '중간', '긴급',
    '스프린트', 'sprint', '현재', '이번', '다음',
    '레이블', 'label', '태그',
    '기한', '마감', '시작일', '생성일', 'due', 'created',
    '오늘', '이번주', '이번 주', '이번달', '이번 달', '지난', '최근',
    // Additional common words
    '해줘', '해주세요', '줘', '주세요', '알려', '보여', '찾아봐',
    '어디', '누구', '무엇', '언제', '어떻게', '왜',
    // Analysis/reasoning keywords
    '분석해줘', '분석', '원인', '해결', '비교', '연관',
  ];
  
  // Also remove the assignee name if found (with variations)
  if (result.assignee) {
    removeWords.push(result.assignee);
    removeWords.push(result.assignee + '의');
    removeWords.push(result.assignee + '님');
    removeWords.push(result.assignee + '님의');
  }
  
  // Remove sprint number if found (e.g., "스프린트5" -> remove "5")
  if (result.sprint && result.sprint.startsWith('sprint_')) {
    const sprintNum = result.sprint.replace('sprint_', '');
    removeWords.push(sprintNum);
    removeWords.push('스프린트' + sprintNum);
    removeWords.push('sprint' + sprintNum);
  }
  
  let searchText = query;
  
  // First, remove Korean particles from the end of words (2+ char particles first, then 1 char)
  // This handles cases like "일감을" -> "일감", "뱅가드를" -> "뱅가드"
  // Important: Only remove particles at word boundaries, not in the middle of words
  const particlePatterns = [
    /([가-힣]{2,})(에서|에게|한테|으로|에는|에도|와는|과는|이나|이라|이란|이랑)(?=\s|$|[^가-힣])/g,
    /([가-힣]{2,})(을|를|은|는|의|로|와|과|도|만|요|야)(?=\s|$|[^가-힣])/g,
  ];
  
  for (const pattern of particlePatterns) {
    searchText = searchText.replace(pattern, '$1');
  }
  
  // Now remove stop words - sort by length (longest first) to avoid partial matches
  const sortedRemoveWords = [...removeWords].sort((a, b) => b.length - a.length);
  for (const word of sortedRemoveWords) {
    // Remove word - this handles "지라에서", "일감", "찾아줘" etc.
    searchText = searchText.replace(new RegExp(word, 'gi'), ' ');
  }
  
  // Remove quotes and special characters that could break JQL
  searchText = searchText.replace(/["'`\\{}[\]()]/g, '');
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

// Check if user is requesting advanced reasoning/analysis
function detectReasoningRequest(query: string): {
  isReasoningRequest: boolean;
  reasoningType: 'correlation' | 'cause' | 'solution' | 'comparison' | 'none';
} {
  const queryLower = query.toLowerCase();
  
  // 문서 간 연관성 분석
  const correlationPatterns = [
    /연관(성|관계|된)/,
    /관련(성|된|이\s*있)/,
    /연결(된|되어|점)/,
    /관계(가|를|는)/,
    /어떤\s*관계/,
    /어떻게\s*연결/,
    /상관(관계|성)/,
    /correlation/i,
    /related/i,
    /connection/i,
  ];
  
  // 문제 원인 추론
  const causePatterns = [
    /원인(이|을|은|분석)/,
    /왜\s*(그런|이런|발생|생긴)/,
    /이유(가|를|는)/,
    /때문(에|인가)/,
    /어째서/,
    /근본\s*원인/,
    /문제(의\s*)?원인/,
    /버그\s*원인/,
    /오류\s*원인/,
    /cause/i,
    /why/i,
    /reason/i,
    /root\s*cause/i,
  ];
  
  // 해결책 제안
  const solutionPatterns = [
    /해결(책|방법|안|하려면)/,
    /어떻게\s*(해결|고치|수정|개선)/,
    /방법(이|을|은)/,
    /대안(이|을|은)/,
    /개선(안|책|방법)/,
    /수정\s*방법/,
    /고치(려면|는\s*방법)/,
    /solution/i,
    /how\s*to\s*(fix|solve|resolve)/i,
    /workaround/i,
    /제안/,
    /추천/,
  ];
  
  // 비교 분석
  const comparisonPatterns = [
    /비교(해|하|분석)/,
    /차이(점|가|를|는)/,
    /다른\s*점/,
    /vs\.?/i,
    /versus/i,
    /대비/,
    /어떤\s*게\s*더/,
    /뭐가\s*더/,
    /장단점/,
    /pros?\s*(and|&)?\s*cons?/i,
    /compare/i,
    /difference/i,
    /distinguish/i,
  ];
  
  if (correlationPatterns.some(p => p.test(query))) {
    return { isReasoningRequest: true, reasoningType: 'correlation' };
  }
  if (causePatterns.some(p => p.test(query))) {
    return { isReasoningRequest: true, reasoningType: 'cause' };
  }
  if (solutionPatterns.some(p => p.test(query))) {
    return { isReasoningRequest: true, reasoningType: 'solution' };
  }
  if (comparisonPatterns.some(p => p.test(query))) {
    return { isReasoningRequest: true, reasoningType: 'comparison' };
  }
  
  return { isReasoningRequest: false, reasoningType: 'none' };
}

// Build system prompt based on reasoning type
function buildSystemPrompt(reasoningType: 'correlation' | 'cause' | 'solution' | 'comparison' | 'none'): string {
  const basePrompt = `당신은 AEGIS 게임 개발 프로젝트의 AI 어시스턴트입니다.
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

  // Add reasoning-specific instructions
  const reasoningInstructions: Record<string, string> = {
    correlation: `

## 🔗 연관성 분석 모드

사용자가 문서/이슈 간의 연관성을 분석해달라고 요청했습니다. 다음 방식으로 분석하세요:

1. **공통 키워드/개념 식별**: 여러 문서에서 반복되는 핵심 개념을 찾으세요.
2. **의존 관계 파악**: A가 B에 의존하거나, B가 A를 참조하는 관계를 설명하세요.
3. **시간적 연관성**: 이슈나 문서의 생성/수정 시점을 고려하여 연관성을 분석하세요.
4. **기능적 연관성**: 같은 기능이나 모듈에 속하는 항목들을 그룹화하세요.
5. **시각적 표현**: 가능하면 관계를 목록이나 구조화된 형태로 보여주세요.

분석 결과는 다음 형식으로 제공하세요:
- **직접 연관**: 명시적으로 참조하거나 의존하는 관계
- **간접 연관**: 공통 주제나 기능을 통한 연결
- **잠재적 연관**: 유사한 패턴이나 문제를 다루는 항목`,

    cause: `

## 🔍 원인 분석 모드

사용자가 문제의 원인을 분석해달라고 요청했습니다. 다음 방식으로 추론하세요:

1. **증상 정리**: 문제의 현상을 명확히 정리하세요.
2. **관련 정보 수집**: 제공된 문서/이슈에서 관련 정보를 찾으세요.
3. **가능한 원인 나열**: 논리적으로 가능한 원인들을 나열하세요.
4. **근거 제시**: 각 원인에 대한 근거를 문서/이슈에서 인용하세요.
5. **가장 유력한 원인**: 가장 가능성 높은 원인을 제시하고 이유를 설명하세요.

분석 결과는 다음 형식으로 제공하세요:
- **문제 현상**: 무엇이 문제인가
- **가능한 원인들**: 원인 후보 목록 (가능성 순)
- **근거**: 각 원인을 뒷받침하는 정보
- **결론**: 가장 유력한 원인과 추론 과정`,

    solution: `

## 💡 해결책 제안 모드

사용자가 해결책을 요청했습니다. 다음 방식으로 제안하세요:

1. **문제 이해**: 해결해야 할 문제를 명확히 파악하세요.
2. **기존 해결 사례 검색**: 유사한 문제가 어떻게 해결되었는지 찾으세요.
3. **해결책 도출**: 문서/이슈 정보를 바탕으로 실행 가능한 해결책을 제안하세요.
4. **단계별 가이드**: 해결 과정을 단계별로 설명하세요.
5. **주의사항**: 해결 시 주의해야 할 점을 언급하세요.

제안은 다음 형식으로 제공하세요:
- **문제 요약**: 해결할 문제
- **제안 해결책**: 구체적인 해결 방법 (우선순위 순)
- **실행 단계**: 단계별 가이드
- **예상 결과**: 해결 후 기대되는 상태
- **대안**: 첫 번째 방법이 안 될 경우의 대안`,

    comparison: `

## ⚖️ 비교 분석 모드

사용자가 비교 분석을 요청했습니다. 다음 방식으로 비교하세요:

1. **비교 대상 명확화**: 무엇과 무엇을 비교하는지 정리하세요.
2. **비교 기준 설정**: 어떤 측면에서 비교할지 기준을 세우세요.
3. **각 항목 분석**: 각 비교 대상의 특징을 정리하세요.
4. **공통점과 차이점**: 유사점과 다른 점을 명확히 구분하세요.
5. **결론/권장사항**: 상황에 따른 선택 가이드를 제공하세요.

비교 결과는 다음 형식으로 제공하세요:
- **비교 대상**: A vs B
- **비교 기준**: 기능, 성능, 복잡도 등
- **비교표**: 테이블 형식으로 정리
- **공통점**: 두 대상의 유사한 점
- **차이점**: 두 대상의 다른 점
- **결론**: 상황별 권장 선택`,

    none: '',
  };

  return basePrompt + (reasoningInstructions[reasoningType] || '');
}

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
    
    // Check if query is asking for sprint information
    let sprints: JiraSprint[] = [];
    if (isSprintInfoQuery(message)) {
      console.log('Sprint info query detected, fetching sprints...');
      sprints = await getActiveSprints(jiraAuth);
      console.log(`Found ${sprints.length} sprints`);
    }
    
    // Check if query is asking for milestone/version information
    let versions: JiraVersion[] = [];
    if (isMilestoneInfoQuery(message)) {
      console.log('Milestone info query detected, fetching versions...');
      versions = await getProjectVersions(jiraAuth);
      console.log(`Found ${versions.length} versions`);
    }
    
    // Check if query is Jira-related and search Jira
    let jiraIssues: JiraIssue[] = [];
    if (isJiraRelatedQuery(message) || jiraOnly) {
      console.log('Searching Jira...');
      jiraIssues = await searchJiraIssues(message, jiraAuth);
      console.log(`Found ${jiraIssues.length} Jira issues`);
      
      // For Jira-only queries, only use Jira context
      if (jiraOnly) {
        context = buildJiraContext(jiraIssues);
        // Add sprint context if available
        if (sprints.length > 0) {
          context = buildSprintContext(sprints) + context;
        }
        // Add version/milestone context if available
        if (versions.length > 0) {
          context = buildVersionContext(versions) + context;
        }
        if (jiraIssues.length === 0 && sprints.length === 0 && versions.length === 0) {
          context = '검색된 Jira 이슈가 없습니다. 검색 조건을 확인해주세요.\n\n';
        }
      } else {
        // Mixed query: include both Confluence and Jira
        context = buildContext(relevantPages, contents);
        if (sprints.length > 0) {
          context += buildSprintContext(sprints);
        }
        if (versions.length > 0) {
          context += buildVersionContext(versions);
        }
        context += buildJiraContext(jiraIssues);
      }
    } else {
      // Confluence-only query
      context = buildContext(relevantPages, contents);
      // Still add sprint info if requested
      if (sprints.length > 0) {
        context += buildSprintContext(sprints);
      }
      // Still add version info if requested
      if (versions.length > 0) {
        context += buildVersionContext(versions);
      }
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
      createdAt?: string;
    }[] = [];
    
    // Only include Confluence results if not a Jira-only query
    if (!jiraOnly && relevantPages.length > 0) {
      // Sort by score (highest first)
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
        createdAt: undefined,
      })));
      
      // Content-only matches (sorted by score)
      sources.push(...contentOnlyMatches.map(p => ({
        type: 'confluence' as const,
        title: p.title,
        url: p.url,
        score: p.score,
        matchType: 'content' as const,
        createdAt: undefined,
      })));
    }
    
    // Sort Jira issues by created date (newest first)
    const sortedJiraIssues = [...jiraIssues].sort((a, b) => {
      // Sort by created date descending (newest first)
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });
    
    // Always include Jira issues
    sources.push(...sortedJiraIssues.map(issue => ({
      type: 'jira' as const,
      title: `${issue.key}: ${issue.summary}`,
      url: issue.url,
      score: undefined,
      matchType: undefined,
      createdAt: issue.created,
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

    // Detect if user is requesting advanced reasoning
    const { isReasoningRequest, reasoningType } = detectReasoningRequest(message);
    if (isReasoningRequest) {
      console.log(`Reasoning request detected: ${reasoningType}`);
    }
    
    // Build system prompt based on reasoning type
    const systemPrompt = buildSystemPrompt(reasoningType);

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
        max_tokens: isReasoningRequest ? 4096 : 2048, // More tokens for reasoning
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
