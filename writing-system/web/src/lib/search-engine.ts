/**
 * Advanced Search Engine for Confluence Documents
 * 
 * Features:
 * 1. Korean morphological analysis (형태소 분석)
 * 2. TF-IDF weighting
 * 3. Synonym/similar word expansion
 * 4. Vector embedding semantic search
 * 5. Substring matching (부분 문자열 매칭)
 * 6. Proximity search (근접도 검색)
 */

// ============================================
// 1. Korean Morphological Analysis (형태소 분석)
// ============================================

// Korean stopwords (불용어) - 단독으로만 불용어 처리
const KOREAN_STOPWORDS = new Set([
  '이', '그', '저', '것', '수', '등', '및', '또는', '그리고', '하지만', '그러나',
  '때문', '위해', '통해', '대해', '관해', '따라', '의해',
  '있다', '없다', '하다', '되다', '이다', '아니다', '같다', '다르다',
  '있는', '없는', '하는', '되는',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  'and', 'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither',
  'not', 'only', 'own', 'same', 'than', 'too', 'very', 'just',
]);

// Korean particles/suffixes to remove (조사/어미)
const KOREAN_PARTICLES = [
  // 조사 (긴 것부터 먼저 체크)
  '에서는', '으로는', '에게는', '한테는', '로부터', '에서도', '으로도',
  '에서', '에게', '한테', '으로', '로서', '로써', '부터', '까지', '처럼', '같이', '만큼', '보다',
  '라고', '다고', '이라고', '라는', '이라는', '라면', '이라면',
  '에는', '에도', '와는', '과는', '도', '만', '조차', '마저', '뿐',
  '의', '를', '을', '가', '이', '은', '는', '에', '와', '과', '로',
  // 어미
  '하여', '하고', '하면', '하는', '했던', '했다', '한다', '합니다', '입니다', '습니다', '됩니다',
  '이다', '였다', '이었다', '인', '적', '들',
];

// Extract Korean word stem by removing particles
function removeKoreanParticles(word: string): string {
  let stem = word;
  
  // Try to remove particles (longest first)
  for (const particle of KOREAN_PARTICLES) {
    if (stem.endsWith(particle) && stem.length > particle.length) {
      const newStem = stem.slice(0, -particle.length);
      // Only remove if remaining part is at least 1 character for Korean
      if (newStem.length >= 1) {
        stem = newStem;
        break; // Only remove one particle
      }
    }
  }
  
  return stem;
}

// Extract all possible forms of a Korean word
function extractKoreanForms(word: string): string[] {
  const forms: string[] = [];
  
  // Original word
  if (word.length >= 1) {
    forms.push(word);
  }
  
  // Stem without particles
  const stem = removeKoreanParticles(word);
  if (stem !== word && stem.length >= 1) {
    forms.push(stem);
  }
  
  // For compound words, also try splitting
  // e.g., "봇의" -> "봇", "봇사격" -> "봇", "사격"
  
  return [...new Set(forms)];
}

// Simple Korean morpheme extraction (improved version)
function extractKoreanMorphemes(text: string): string[] {
  const morphemes: string[] = [];
  
  // Remove special characters but keep Korean, English, numbers, and some punctuation
  const cleaned = text.replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318Fa-zA-Z0-9\s\-_\.]/g, ' ');
  
  // Split by whitespace
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  for (const word of words) {
    // Skip pure stopwords
    if (KOREAN_STOPWORDS.has(word.toLowerCase())) continue;
    
    // Korean word processing
    if (/[\uAC00-\uD7AF]/.test(word)) {
      const forms = extractKoreanForms(word);
      for (const form of forms) {
        if (form.length >= 1 && !KOREAN_STOPWORDS.has(form)) {
          morphemes.push(form);
        }
      }
    } else {
      // English/number word
      if (word.length >= 1) {
        morphemes.push(word.toLowerCase());
      }
    }
  }
  
  return morphemes;
}

// Extract search keywords from query (more aggressive extraction)
function extractSearchKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // Clean and split
  const cleaned = query.replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318Fa-zA-Z0-9\s]/g, ' ');
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  
  for (const word of words) {
    // Skip common query words
    const skipWords = new Set(['관련', '문서', '찾아', '찾아줘', '알려줘', '보여줘', '모두', '전부', '있는', '대한', '에서']);
    if (skipWords.has(word)) continue;
    
    if (/[\uAC00-\uD7AF]/.test(word)) {
      // Add original
      if (word.length >= 1) keywords.push(word);
      
      // Add stem
      const stem = removeKoreanParticles(word);
      if (stem !== word && stem.length >= 1) {
        keywords.push(stem);
      }
    } else if (word.length >= 1) {
      keywords.push(word.toLowerCase());
    }
  }
  
  return [...new Set(keywords)];
}

// N-gram extraction for better matching
function extractNgrams(text: string, n: number = 2): string[] {
  const ngrams: string[] = [];
  const cleaned = text.replace(/\s+/g, '');
  
  for (let i = 0; i <= cleaned.length - n; i++) {
    ngrams.push(cleaned.substring(i, i + n));
  }
  
  return ngrams;
}

// Check if any keyword is contained in text (substring match)
// IMPROVED: Also checks if keyword matches word stems in text
function substringMatch(text: string, keywords: string[]): { matched: string[]; score: number } {
  const textLower = text.toLowerCase();
  const matched: string[] = [];
  let score = 0;
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    
    // Direct substring match
    if (textLower.includes(keywordLower)) {
      matched.push(keyword);
      score += keyword.length >= 3 ? 3 : 2;
      continue;
    }
    
    // Check if keyword matches any word stem in text
    // e.g., "봇" should match "봇의", "봇은", "봇이" etc.
    const textWords = text.split(/[\s\-_\.,:;!?()[\]{}'"]+/).filter(w => w.length > 0);
    for (const textWord of textWords) {
      const textWordLower = textWord.toLowerCase();
      const textWordStem = removeKoreanParticles(textWordLower);
      
      // Check if keyword matches the stem
      if (textWordStem === keywordLower || textWordLower.startsWith(keywordLower)) {
        matched.push(keyword);
        score += keyword.length >= 3 ? 3 : 2;
        break;
      }
    }
  }
  
  return { matched, score };
}

// Advanced Korean text matching - checks if keyword exists in text considering particles
function koreanTextContains(text: string, keyword: string): boolean {
  const textLower = text.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  
  // Direct match
  if (textLower.includes(keywordLower)) {
    return true;
  }
  
  // Check each word in text
  const textWords = text.split(/[\s\-_\.,:;!?()[\]{}'"]+/).filter(w => w.length > 0);
  for (const textWord of textWords) {
    const textWordLower = textWord.toLowerCase();
    
    // Check if text word starts with keyword (e.g., "봇의" starts with "봇")
    if (textWordLower.startsWith(keywordLower)) {
      return true;
    }
    
    // Check if keyword matches the stem of text word
    const textWordStem = removeKoreanParticles(textWordLower);
    if (textWordStem === keywordLower) {
      return true;
    }
    
    // Check if text word contains keyword as a component
    // e.g., "자동사격" contains "사격"
    if (textWordLower.includes(keywordLower)) {
      return true;
    }
  }
  
  return false;
}

// Count keyword occurrences in text (considering Korean particles)
function countKoreanMatches(text: string, keyword: string): number {
  const textLower = text.toLowerCase();
  const keywordLower = keyword.toLowerCase();
  let count = 0;
  
  // Direct matches
  const directMatches = textLower.split(keywordLower).length - 1;
  count += directMatches;
  
  // If no direct matches, check word-by-word
  if (count === 0) {
    const textWords = text.split(/[\s\-_\.,:;!?()[\]{}'"]+/).filter(w => w.length > 0);
    for (const textWord of textWords) {
      const textWordLower = textWord.toLowerCase();
      const textWordStem = removeKoreanParticles(textWordLower);
      
      if (textWordStem === keywordLower || textWordLower.startsWith(keywordLower)) {
        count++;
      }
    }
  }
  
  return count;
}

// Calculate proximity score - how close keywords are to each other
function calculateProximityScore(text: string, keywords: string[]): number {
  if (keywords.length < 2) return 0;
  
  const textLower = text.toLowerCase();
  const positions: number[] = [];
  
  for (const keyword of keywords) {
    // Find position considering Korean particles
    let pos = textLower.indexOf(keyword.toLowerCase());
    
    // If not found directly, search word by word
    if (pos === -1) {
      const words = text.split(/[\s\-_\.,:;!?()[\]{}'"]+/);
      let currentPos = 0;
      for (const word of words) {
        const wordLower = word.toLowerCase();
        const wordStem = removeKoreanParticles(wordLower);
        if (wordStem === keyword.toLowerCase() || wordLower.startsWith(keyword.toLowerCase())) {
          pos = textLower.indexOf(word, currentPos);
          break;
        }
        currentPos = textLower.indexOf(word, currentPos) + word.length;
      }
    }
    
    if (pos !== -1) {
      positions.push(pos);
    }
  }
  
  if (positions.length < 2) return 0;
  
  // Calculate average distance between keywords
  positions.sort((a, b) => a - b);
  let totalDistance = 0;
  for (let i = 1; i < positions.length; i++) {
    totalDistance += positions[i] - positions[i - 1];
  }
  const avgDistance = totalDistance / (positions.length - 1);
  
  // Closer keywords = higher score (max 20 points)
  // If within 50 chars, full score; decreases as distance increases
  if (avgDistance <= 50) return 20;
  if (avgDistance <= 100) return 15;
  if (avgDistance <= 200) return 10;
  if (avgDistance <= 500) return 5;
  return 2;
}

// ============================================
// 2. TF-IDF Implementation
// ============================================

interface TfIdfDocument {
  id: string;
  title: string;
  content: string;
  terms: Map<string, number>; // term -> frequency
  termCount: number;
}

interface TfIdfIndex {
  documents: Map<string, TfIdfDocument>;
  documentFrequency: Map<string, number>; // term -> number of docs containing term
  totalDocuments: number;
}

function buildTfIdfIndex(pages: { id: string; title: string; content: string }[]): TfIdfIndex {
  const documents = new Map<string, TfIdfDocument>();
  const documentFrequency = new Map<string, number>();
  
  for (const page of pages) {
    const fullText = `${page.title} ${page.title} ${page.title} ${page.content}`; // Title weighted 3x
    const morphemes = extractKoreanMorphemes(fullText);
    
    const terms = new Map<string, number>();
    for (const morpheme of morphemes) {
      terms.set(morpheme, (terms.get(morpheme) || 0) + 1);
    }
    
    documents.set(page.id, {
      id: page.id,
      title: page.title,
      content: page.content,
      terms,
      termCount: morphemes.length,
    });
    
    // Update document frequency
    const uniqueTerms = new Set(morphemes);
    for (const term of uniqueTerms) {
      documentFrequency.set(term, (documentFrequency.get(term) || 0) + 1);
    }
  }
  
  return {
    documents,
    documentFrequency,
    totalDocuments: pages.length,
  };
}

function calculateTfIdf(term: string, doc: TfIdfDocument, index: TfIdfIndex): number {
  const tf = (doc.terms.get(term) || 0) / Math.max(doc.termCount, 1);
  const df = index.documentFrequency.get(term) || 0;
  const idf = df > 0 ? Math.log(index.totalDocuments / df) + 1 : 0;
  return tf * idf;
}

function searchWithTfIdf(
  query: string,
  index: TfIdfIndex,
  maxResults: number = 30
): { id: string; score: number }[] {
  const queryTerms = extractKoreanMorphemes(query);
  const scores: { id: string; score: number }[] = [];
  
  for (const [docId, doc] of index.documents) {
    let score = 0;
    for (const term of queryTerms) {
      score += calculateTfIdf(term, doc, index);
    }
    if (score > 0) {
      scores.push({ id: docId, score });
    }
  }
  
  return scores.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

// ============================================
// 3. Synonym/Similar Word Dictionary
// ============================================

// Game development and technical synonyms
const SYNONYM_DICTIONARY: Record<string, string[]> = {
  // 게임 개발 용어
  '캐릭터': ['character', '플레이어', 'player', '주인공', 'npc', '적', 'enemy', '몬스터', 'monster'],
  '봇': ['bot', 'ai', '인공지능', 'npc', '컴퓨터', '자동'],
  '사격': ['shooting', 'shot', 'fire', '발사', '공격', 'attack', '슈팅'],
  '판단': ['decision', 'judge', 'judgment', '결정', '선택', 'selection', '로직', 'logic'],
  '스킬': ['skill', '기술', '능력', 'ability', '스펠', 'spell', '마법', 'magic'],
  '아이템': ['item', '장비', 'equipment', '무기', 'weapon', '방어구', 'armor', '소모품', 'consumable'],
  '퀘스트': ['quest', '미션', 'mission', '임무', 'task', '목표', 'objective'],
  '레벨': ['level', 'lv', '단계', '등급', 'tier', 'rank'],
  '스테이지': ['stage', '맵', 'map', '던전', 'dungeon', '필드', 'field', '월드', 'world'],
  '보스': ['boss', '보스몬스터', '레이드보스', 'raid boss', '중간보스', 'mid boss'],
  'ui': ['유아이', 'user interface', '인터페이스', 'interface', 'hud', '화면'],
  'ux': ['유엑스', 'user experience', '사용자경험'],
  '버그': ['bug', '오류', 'error', '결함', 'defect', '이슈', 'issue', '문제', 'problem'],
  '기획': ['planning', '설계', 'design', '디자인', '구상', '계획'],
  '개발': ['development', 'dev', '구현', 'implementation', '제작', '프로그래밍', 'programming', '코딩', 'coding'],
  '테스트': ['test', 'testing', 'qa', '품질', 'quality', '검증', 'verification'],
  '배포': ['deploy', 'deployment', '릴리즈', 'release', '출시', 'launch', '배포'],
  '서버': ['server', '백엔드', 'backend', '서버사이드', 'server-side'],
  '클라이언트': ['client', '프론트엔드', 'frontend', '클라사이드', 'client-side'],
  '데이터': ['data', '정보', 'information', 'db', 'database', '데이터베이스'],
  'api': ['에이피아이', 'interface', '인터페이스', 'endpoint', '엔드포인트'],
  '성능': ['performance', '퍼포먼스', '최적화', 'optimization', '속도', 'speed'],
  '메모리': ['memory', '램', 'ram', '용량'],
  
  // 프로젝트 관리 용어
  '일정': ['schedule', '스케줄', '타임라인', 'timeline', '마일스톤', 'milestone'],
  '회의': ['meeting', '미팅', '회의록', 'minutes', '논의', 'discussion'],
  '문서': ['document', 'doc', '문서화', 'documentation', '자료', 'material'],
  '리뷰': ['review', '검토', '피드백', 'feedback', '코드리뷰', 'code review'],
  '승인': ['approval', '허가', 'permission', '결재', '확인', 'confirmation'],
  
  // AEGIS 프로젝트 특화
  'aegis': ['이지스', '에이지스', '프로젝트'],
  '컨플루언스': ['confluence', '위키', 'wiki', '문서'],
  '지라': ['jira', '이슈트래커', 'issue tracker', '티켓', 'ticket'],
};

// Build reverse lookup
const REVERSE_SYNONYM_MAP = new Map<string, string[]>();
for (const [key, synonyms] of Object.entries(SYNONYM_DICTIONARY)) {
  // Add key to its own synonyms
  const allTerms = [key, ...synonyms];
  for (const term of allTerms) {
    const existing = REVERSE_SYNONYM_MAP.get(term.toLowerCase()) || [];
    for (const t of allTerms) {
      if (!existing.includes(t.toLowerCase())) {
        existing.push(t.toLowerCase());
      }
    }
    REVERSE_SYNONYM_MAP.set(term.toLowerCase(), existing);
  }
}

function expandWithSynonyms(terms: string[]): string[] {
  const expanded = new Set<string>();
  
  for (const term of terms) {
    expanded.add(term.toLowerCase());
    
    // Check synonym dictionary
    const synonyms = REVERSE_SYNONYM_MAP.get(term.toLowerCase());
    if (synonyms) {
      for (const syn of synonyms) {
        expanded.add(syn);
      }
    }
  }
  
  return Array.from(expanded);
}

// ============================================
// 4. Vector Embedding Semantic Search
// ============================================

// Simple word vectors based on co-occurrence (lightweight alternative to full embeddings)
// For production, consider using actual embedding models via API

interface WordVector {
  [word: string]: number[];
}

// Pre-computed simple vectors for common terms (simplified)
// In production, use actual embedding API (OpenAI, Cohere, etc.)
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Character-level embedding for Korean (simple hash-based)
function getSimpleEmbedding(text: string, dimensions: number = 64): number[] {
  const vector = new Array(dimensions).fill(0);
  const chars = text.split('');
  
  for (let i = 0; i < chars.length; i++) {
    const charCode = chars[i].charCodeAt(0);
    const position = i % dimensions;
    vector[position] += Math.sin(charCode * 0.1) * (1 / (i + 1));
    vector[(position + 1) % dimensions] += Math.cos(charCode * 0.1) * (1 / (i + 1));
  }
  
  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }
  
  return vector;
}

// Semantic similarity using character embeddings
function semanticSimilarity(text1: string, text2: string): number {
  const emb1 = getSimpleEmbedding(text1);
  const emb2 = getSimpleEmbedding(text2);
  return cosineSimilarity(emb1, emb2);
}

// ============================================
// 5. Integrated Search Engine
// ============================================

export interface SearchResult {
  id: string;
  title: string;
  url: string;
  snippet: string;
  score: number;
  matchDetails: {
    titleMatch: number;
    contentMatch: number;
    tfidfScore: number;
    synonymMatch: number;
    semanticScore: number;
    proximityScore: number;
    substringScore: number;
  };
}

export interface SearchableDocument {
  id: string;
  title: string;
  content: string;
  url: string;
}

export class AdvancedSearchEngine {
  private documents: SearchableDocument[] = [];
  private tfidfIndex: TfIdfIndex | null = null;
  private documentEmbeddings: Map<string, number[]> = new Map();
  
  constructor() {}
  
  // Index documents
  indexDocuments(documents: SearchableDocument[]): void {
    this.documents = documents;
    
    // Build TF-IDF index
    this.tfidfIndex = buildTfIdfIndex(
      documents.map(d => ({ id: d.id, title: d.title, content: d.content }))
    );
    
    // Pre-compute document embeddings
    this.documentEmbeddings.clear();
    for (const doc of documents) {
      const fullText = `${doc.title} ${doc.content}`.substring(0, 1000); // Limit for performance
      this.documentEmbeddings.set(doc.id, getSimpleEmbedding(fullText));
    }
    
    console.log(`Indexed ${documents.length} documents for advanced search`);
  }
  
  // Main search function - IMPROVED
  search(query: string, maxResults: number = 30): SearchResult[] {
    if (!this.tfidfIndex || this.documents.length === 0) {
      return [];
    }
    
    // Extract search keywords (improved extraction)
    const searchKeywords = extractSearchKeywords(query);
    const queryMorphemes = extractKoreanMorphemes(query);
    const allKeywords = [...new Set([...searchKeywords, ...queryMorphemes])];
    const expandedTerms = expandWithSynonyms(allKeywords);
    const queryEmbedding = getSimpleEmbedding(query);
    const queryNgrams = extractNgrams(query, 2);
    
    console.log(`Search query: "${query}"`);
    console.log(`Keywords: ${searchKeywords.join(', ')}`);
    console.log(`Expanded terms: ${expandedTerms.slice(0, 10).join(', ')}...`);
    
    // Get TF-IDF scores
    const tfidfScores = searchWithTfIdf(query, this.tfidfIndex, this.documents.length);
    const tfidfMap = new Map(tfidfScores.map(s => [s.id, s.score]));
    
    const results: SearchResult[] = [];
    
    for (const doc of this.documents) {
      const fullText = `${doc.title} ${doc.content}`;
      
      // 1. Title match score - IMPROVED with Korean particle handling
      let titleMatch = 0;
      
      // Check each search keyword against title (with Korean particle awareness)
      for (const keyword of searchKeywords) {
        // Use advanced Korean text matching
        if (koreanTextContains(doc.title, keyword)) {
          // Match found - high score for title matches
          titleMatch += keyword.length >= 3 ? 30 : 25;
        }
      }
      
      // Also check expanded terms (synonyms)
      for (const term of expandedTerms) {
        if (!searchKeywords.some(k => k.toLowerCase() === term.toLowerCase())) {
          if (koreanTextContains(doc.title, term)) {
            titleMatch += term.length >= 3 ? 12 : 8;
          }
        }
      }
      
      // 2. Content match score - IMPROVED with Korean particle handling
      let contentMatch = 0;
      
      // Direct keyword matching in content (with Korean awareness)
      for (const keyword of searchKeywords) {
        const matches = countKoreanMatches(doc.content, keyword);
        if (matches > 0) {
          contentMatch += Math.min(matches * 4, 20);
        }
      }
      
      // Expanded terms matching
      for (const term of expandedTerms) {
        if (!searchKeywords.some(k => k.toLowerCase() === term.toLowerCase())) {
          const matches = countKoreanMatches(doc.content, term);
          contentMatch += Math.min(matches * 2, 8);
        }
      }
      
      // N-gram matching for partial matches
      for (const ngram of queryNgrams) {
        if (doc.content.toLowerCase().includes(ngram.toLowerCase())) {
          contentMatch += 1;
        }
      }
      
      // 3. TF-IDF score
      const tfidfScore = (tfidfMap.get(doc.id) || 0) * 15;
      
      // 4. Synonym expansion bonus
      let synonymMatch = 0;
      const originalTermsSet = new Set(searchKeywords.map(t => t.toLowerCase()));
      for (const term of expandedTerms) {
        if (!originalTermsSet.has(term.toLowerCase())) {
          if (koreanTextContains(doc.title, term)) {
            synonymMatch += 10;
          } else if (koreanTextContains(doc.content, term)) {
            synonymMatch += 4;
          }
        }
      }
      
      // 5. Semantic similarity score
      const docEmbedding = this.documentEmbeddings.get(doc.id);
      const semanticScore = docEmbedding 
        ? cosineSimilarity(queryEmbedding, docEmbedding) * 10 
        : 0;
      
      // 6. Proximity score - NEW: how close are the keywords to each other?
      const proximityScore = calculateProximityScore(fullText, searchKeywords);
      
      // 7. Substring score - NEW: direct substring matching
      const titleSubstring = substringMatch(doc.title, searchKeywords);
      const contentSubstring = substringMatch(doc.content, searchKeywords);
      const substringScore = (titleSubstring.score * 5) + (contentSubstring.score * 2);
      
      // Calculate total score
      const totalScore = titleMatch + contentMatch + tfidfScore + synonymMatch + semanticScore + proximityScore + substringScore;
      
      // Lower threshold to catch more results
      if (totalScore > 0 || titleSubstring.matched.length > 0 || contentSubstring.matched.length > 0) {
        // Extract best snippet
        const snippet = this.extractBestSnippet(doc.content, [...searchKeywords, ...expandedTerms]);
        
        results.push({
          id: doc.id,
          title: doc.title,
          url: doc.url,
          snippet,
          score: Math.max(totalScore, 1), // Ensure minimum score of 1 if any match
          matchDetails: {
            titleMatch,
            contentMatch,
            tfidfScore,
            synonymMatch,
            semanticScore,
            proximityScore,
            substringScore,
          },
        });
      }
    }
    
    // Sort by score and return top results
    const sortedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);
    
    if (sortedResults.length > 0) {
      console.log(`Found ${results.length} results, returning top ${sortedResults.length}`);
      console.log(`Top result: "${sortedResults[0].title}" (score: ${sortedResults[0].score.toFixed(1)})`);
    } else {
      console.log('No results found');
    }
    
    return sortedResults;
  }
  
  // Extract the best snippet containing search terms
  private extractBestSnippet(content: string, terms: string[]): string {
    const contentLower = content.toLowerCase();
    let bestStart = 0;
    let bestScore = 0;
    
    // Find the position with most term matches nearby
    const step = Math.min(50, Math.max(10, Math.floor(content.length / 100)));
    for (let i = 0; i < Math.max(1, content.length - 200); i += step) {
      const window = contentLower.substring(i, i + 300);
      let score = 0;
      for (const term of terms) {
        if (window.includes(term.toLowerCase())) {
          score += term.length;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestStart = i;
      }
    }
    
    // Extract snippet
    const start = Math.max(0, bestStart - 50);
    const end = Math.min(content.length, bestStart + 250);
    let snippet = content.substring(start, end).replace(/\n+/g, ' ').trim();
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    return snippet || content.substring(0, 200) + '...';
  }
  
  // Get search statistics
  getStats(): { documentCount: number; termCount: number } {
    return {
      documentCount: this.documents.length,
      termCount: this.tfidfIndex?.documentFrequency.size || 0,
    };
  }
}

// Singleton instance
let searchEngineInstance: AdvancedSearchEngine | null = null;

export function getSearchEngine(): AdvancedSearchEngine {
  if (!searchEngineInstance) {
    searchEngineInstance = new AdvancedSearchEngine();
  }
  return searchEngineInstance;
}

export function resetSearchEngine(): void {
  searchEngineInstance = null;
}
