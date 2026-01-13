// Slack message types
export interface SlackMessage {
  text?: string;
  user?: string;
  channel?: string;
  ts?: string;
  thread_ts?: string;
  channel_type?: string;
  subtype?: string;
}

export interface AppMentionEvent {
  text: string;
  user: string;
  channel: string;
  ts: string;
  thread_ts?: string;
}

// Chat response types
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

// Jira types
export interface JiraIssue {
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

// Confluence types
export interface PageIndex {
  space_key: string;
  synced_at: string;
  total_pages: number;
  pages: PageInfo[];
}

export interface PageInfo {
  id: string;
  title: string;
  filename: string;
  url?: string;
  created_by?: string;
  created_by_email?: string;
  created_date?: string;
  updated_by?: string;
  updated_date?: string;
}

// Slack block types
export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  elements?: SlackElement[];
  accessory?: any;
}

export interface SlackElement {
  type: string;
  text?: string;
}

export interface SlackMessagePayload {
  text: string;
  blocks?: SlackBlock[];
  unfurl_links?: boolean;
  unfurl_media?: boolean;
  thread_ts?: string;
  response_type?: 'in_channel' | 'ephemeral';
  replace_original?: boolean;
}
