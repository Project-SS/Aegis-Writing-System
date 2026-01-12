'use client';

import { useState, useEffect } from 'react';
import { Header, Background } from '@/components/layout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { 
  getStyleGuideProfiles, 
  getActiveStyleGuideId, 
  setActiveStyleGuideId,
  addStyleGuideProfile,
  updateStyleGuideProfile,
  deleteStyleGuideProfile,
  duplicateStyleGuideProfile,
  getFeedbackLog 
} from '@/lib/storage';
import { StyleGuideProfile, FeedbackEntry } from '@/types';
import { 
  BookOpen, 
  Save, 
  Check, 
  History, 
  ThumbsUp, 
  ThumbsDown, 
  RefreshCw,
  Plus,
  Trash2,
  Copy,
  Edit3,
  CheckCircle,
  X,
  FileText,
} from 'lucide-react';

export default function StyleGuidePage() {
  const [profiles, setProfiles] = useState<StyleGuideProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [editingContent, setEditingContent] = useState('');
  const [feedbackLog, setFeedbackLog] = useState<FeedbackEntry[]>([]);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'feedback'>('guide');
  
  // 새 프로필 생성 모달
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');
  
  // 프로필 이름 편집
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingProfileName, setEditingProfileName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const loadedProfiles = getStyleGuideProfiles();
    setProfiles(loadedProfiles);
    
    const activeId = getActiveStyleGuideId();
    setActiveProfileId(activeId);
    
    const activeProfile = loadedProfiles.find(p => p.id === activeId) || loadedProfiles[0];
    if (activeProfile) {
      setEditingContent(activeProfile.content);
    }
    
    setFeedbackLog(getFeedbackLog());
  };

  const handleSelectProfile = (profileId: string) => {
    // 현재 편집 중인 내용 저장
    if (activeProfileId && editingContent) {
      updateStyleGuideProfile(activeProfileId, { content: editingContent });
    }
    
    setActiveStyleGuideId(profileId);
    setActiveProfileId(profileId);
    
    const profile = profiles.find(p => p.id === profileId);
    if (profile) {
      setEditingContent(profile.content);
    }
    
    loadData();
  };

  const handleSave = () => {
    if (activeProfileId) {
      updateStyleGuideProfile(activeProfileId, { content: editingContent });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      loadData();
    }
  };

  const handleCreateProfile = () => {
    if (!newProfileName.trim()) return;
    
    const defaultContent = `# ${newProfileName}

## 문체

### 기본 톤
- 

### 문장 스타일
- 

## 선호하는 표현

### 시작 패턴
- 

### 좋은 예시
- 

## 피해야 할 표현

### 금지 표현
- 

## 구조

### 기본 구조
1. Hook
2. 배경/문제
3. 인사이트/해결
4. 적용 방법
5. CTA

## 글자 수 가이드

- 이상적: 800-1,200자
- 최소: 500자
- 최대: 1,500자
`;
    
    const newProfile = addStyleGuideProfile({
      name: newProfileName,
      description: newProfileDesc || undefined,
      content: defaultContent,
    });
    
    setShowNewModal(false);
    setNewProfileName('');
    setNewProfileDesc('');
    
    // 새 프로필 선택
    handleSelectProfile(newProfile.id);
  };

  const handleDuplicateProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    const newProfile = duplicateStyleGuideProfile(profileId, `${profile.name} (복사본)`);
    if (newProfile) {
      loadData();
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return;
    
    if (profile.isDefault) {
      alert('기본 스타일 가이드는 삭제할 수 없습니다.');
      return;
    }
    
    if (profiles.length <= 1) {
      alert('최소 1개의 스타일 가이드가 필요합니다.');
      return;
    }
    
    if (confirm(`"${profile.name}" 스타일 가이드를 삭제하시겠습니까?`)) {
      deleteStyleGuideProfile(profileId);
      loadData();
    }
  };

  const handleStartEditName = (profile: StyleGuideProfile) => {
    setEditingProfileId(profile.id);
    setEditingProfileName(profile.name);
  };

  const handleSaveProfileName = () => {
    if (editingProfileId && editingProfileName.trim()) {
      updateStyleGuideProfile(editingProfileId, { name: editingProfileName });
      setEditingProfileId(null);
      setEditingProfileName('');
      loadData();
    }
  };

  const handleCancelEditName = () => {
    setEditingProfileId(null);
    setEditingProfileName('');
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId);

  return (
    <Background>
      <Header title="스타일 가이드" subtitle="나만의 글쓰기 스타일을 정의하고 관리합니다" />

      <div className="p-8 max-w-7xl mx-auto">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'guide'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <BookOpen className="w-4 h-4 inline-block mr-2" />
            스타일 가이드
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'feedback'
                ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            <History className="w-4 h-4 inline-block mr-2" />
            피드백 로그
            {feedbackLog.length > 0 && (
              <Badge variant="accent" size="sm" className="ml-2">
                {feedbackLog.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Style Guide Tab */}
        {activeTab === 'guide' && (
          <div className="flex gap-6">
            {/* Profile List - Left Sidebar */}
            <div className="w-72 flex-shrink-0">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">스타일 프로필</CardTitle>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setShowNewModal(true)}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      새로 만들기
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.id}
                      className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                        profile.id === activeProfileId
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                          : 'border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50 bg-[var(--bg-secondary)]'
                      }`}
                      onClick={() => handleSelectProfile(profile.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingProfileId === profile.id ? (
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editingProfileName}
                                onChange={(e) => setEditingProfileName(e.target.value)}
                                className="h-7 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveProfileName();
                                  if (e.key === 'Escape') handleCancelEditName();
                                }}
                              />
                              <button onClick={handleSaveProfileName} className="text-[var(--success)]">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={handleCancelEditName} className="text-[var(--text-muted)]">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                                {profile.name}
                              </p>
                              {profile.id === activeProfileId && (
                                <CheckCircle className="w-4 h-4 text-[var(--accent-primary)] flex-shrink-0" />
                              )}
                            </div>
                          )}
                          {profile.description && (
                            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                              {profile.description}
                            </p>
                          )}
                          <p className="text-xs text-[var(--text-muted)] mt-1">
                            수정: {new Date(profile.updatedAt).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleStartEditName(profile)}
                            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="이름 편집"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicateProfile(profile.id)}
                            className="p-1 hover:bg-[var(--bg-hover)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                            title="복제"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!profile.isDefault && (
                            <button
                              onClick={() => handleDeleteProfile(profile.id)}
                              className="p-1 hover:bg-[var(--error)]/20 rounded text-[var(--text-muted)] hover:text-[var(--error)]"
                              title="삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {profile.isDefault && (
                        <Badge variant="default" size="sm" className="mt-2">기본</Badge>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Editor - Main Content */}
            <div className="flex-1 min-w-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[var(--accent-primary)]" />
                      </div>
                      <div>
                        <CardTitle>{activeProfile?.name || '스타일 가이드'}</CardTitle>
                        <CardDescription>마크다운 형식으로 작성하세요</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    rows={30}
                    className="font-mono text-sm"
                    placeholder="스타일 가이드를 마크다운 형식으로 작성하세요..."
                  />
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <p className="text-xs text-[var(--text-muted)]">
                    변경사항은 자동으로 저장되지 않습니다. 저장 버튼을 눌러주세요.
                  </p>
                  <Button onClick={handleSave} icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}>
                    {saved ? '저장됨' : '저장'}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}

        {/* Feedback Log Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            {feedbackLog.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <History className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4" />
                  <p className="text-[var(--text-secondary)]">아직 피드백 기록이 없습니다.</p>
                  <p className="text-sm text-[var(--text-muted)] mt-2">
                    글 작성 후 피드백을 남기면 여기에 기록됩니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              feedbackLog.map((entry) => (
                <Card key={entry.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{entry.contentTitle}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.passedFirstTime ? 'success' : 'warning'}>
                          {entry.reviewScore}점
                        </Badge>
                        <span className="text-xs text-[var(--text-muted)]">
                          {new Date(entry.date).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {entry.satisfied.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsUp className="w-4 h-4 text-[var(--success)]" />
                          <span className="text-sm font-medium text-[var(--success)]">만족</span>
                        </div>
                        <ul className="space-y-1">
                          {entry.satisfied.map((item, i) => (
                            <li key={i} className="text-sm text-[var(--text-secondary)] pl-6">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {entry.unsatisfied.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <ThumbsDown className="w-4 h-4 text-[var(--error)]" />
                          <span className="text-sm font-medium text-[var(--error)]">개선 필요</span>
                        </div>
                        <ul className="space-y-1">
                          {entry.unsatisfied.map((item, i) => (
                            <li key={i} className="text-sm text-[var(--text-secondary)] pl-6">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* New Profile Modal */}
        {showNewModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>새 스타일 가이드 만들기</CardTitle>
                <CardDescription>새로운 글쓰기 스타일 프로필을 생성합니다</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                    프로필 이름 *
                  </label>
                  <Input
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    placeholder="예: 기술 블로그 스타일"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-[var(--text-primary)] mb-1.5 block">
                    설명 (선택)
                  </label>
                  <Input
                    value={newProfileDesc}
                    onChange={(e) => setNewProfileDesc(e.target.value)}
                    placeholder="예: 개발자 대상 기술 콘텐츠용"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowNewModal(false)}>
                  취소
                </Button>
                <Button onClick={handleCreateProfile} disabled={!newProfileName.trim()}>
                  만들기
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </Background>
  );
}
