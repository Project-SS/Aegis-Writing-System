'use client';

import { useState } from 'react';
import { Strategy } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Textarea } from '@/components/ui/Input';
import { Target, Lightbulb, MessageSquare, ArrowRight, RefreshCw, Edit3, Check, X, Plus } from 'lucide-react';

interface StrategyPanelProps {
  strategy: Strategy;
  onStrategyChange: (strategy: Strategy) => void;
  onRegenerateSection: (section: 'targetAudience' | 'hooks' | 'valueProposition' | 'cta') => void;
  onSelectHook: (index: number) => void;
  onApprove: () => void;
  selectedHook?: number;
  loading?: boolean;
  regeneratingSection?: string | null;
}

export function StrategyPanel({ 
  strategy, 
  onStrategyChange,
  onRegenerateSection,
  onSelectHook, 
  onApprove, 
  selectedHook,
  loading = false,
  regeneratingSection = null,
}: StrategyPanelProps) {
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const startEditing = (section: string, value: string) => {
    setEditingSection(section);
    setEditValues({ ...editValues, [section]: value });
  };

  const cancelEditing = () => {
    setEditingSection(null);
  };

  const saveEditing = (section: string) => {
    const newStrategy = { ...strategy };
    
    switch (section) {
      case 'targetAudience.primary':
        newStrategy.targetAudience = { ...newStrategy.targetAudience, primary: editValues[section] };
        break;
      case 'targetAudience.secondary':
        newStrategy.targetAudience = { ...newStrategy.targetAudience, secondary: editValues[section] };
        break;
      case 'targetAudience.painPoint':
        newStrategy.targetAudience = { ...newStrategy.targetAudience, painPoint: editValues[section] };
        break;
      case 'valueProposition':
        newStrategy.valueProposition = editValues[section];
        break;
      case 'cta':
        newStrategy.cta = editValues[section];
        break;
      default:
        if (section.startsWith('hook.')) {
          const index = parseInt(section.split('.')[1]);
          newStrategy.hooks = [...newStrategy.hooks];
          newStrategy.hooks[index] = editValues[section];
        }
    }
    
    onStrategyChange(newStrategy);
    setEditingSection(null);
  };

  const addNewHook = () => {
    const newStrategy = { ...strategy };
    newStrategy.hooks = [...newStrategy.hooks, '새로운 Hook을 입력하세요...'];
    onStrategyChange(newStrategy);
    startEditing(`hook.${newStrategy.hooks.length - 1}`, '');
  };

  const removeHook = (index: number) => {
    if (strategy.hooks.length <= 1) return;
    const newStrategy = { ...strategy };
    newStrategy.hooks = newStrategy.hooks.filter((_, i) => i !== index);
    onStrategyChange(newStrategy);
    if (selectedHook === index) {
      onSelectHook(0);
    } else if (selectedHook !== undefined && selectedHook > index) {
      onSelectHook(selectedHook - 1);
    }
  };

  const EditableField = ({ 
    section, 
    value, 
    label,
    multiline = false,
  }: { 
    section: string; 
    value: string; 
    label?: string;
    multiline?: boolean;
  }) => {
    const isEditing = editingSection === section;
    
    if (isEditing) {
      return (
        <div className="space-y-2">
          {label && <p className="text-xs text-[var(--text-muted)]">{label}</p>}
          {multiline ? (
            <Textarea
              value={editValues[section] || ''}
              onChange={(e) => setEditValues({ ...editValues, [section]: e.target.value })}
              rows={3}
              className="text-sm"
              autoFocus
            />
          ) : (
            <Input
              value={editValues[section] || ''}
              onChange={(e) => setEditValues({ ...editValues, [section]: e.target.value })}
              className="text-sm"
              autoFocus
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveEditing(section)} icon={<Check className="w-3 h-3" />}>
              저장
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEditing} icon={<X className="w-3 h-3" />}>
              취소
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="group relative">
        {label && <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>}
        <div className="flex items-start gap-2">
          <p className="text-[var(--text-primary)] flex-1">{value}</p>
          <button
            onClick={() => startEditing(section, value)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-hover)] transition-all"
            title="편집"
          >
            <Edit3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Topic */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[var(--accent-primary)]" />
            주제
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg font-medium text-[var(--text-primary)]">{strategy.topic}</p>
        </CardContent>
      </Card>

      {/* Target Audience */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--accent-primary)]" />
              타겟 독자
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onRegenerateSection('targetAudience')}
              disabled={loading || regeneratingSection !== null}
              loading={regeneratingSection === 'targetAudience'}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              재생성
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
            <Badge variant="accent" className="mb-2">주요 타겟</Badge>
            <EditableField 
              section="targetAudience.primary" 
              value={strategy.targetAudience.primary} 
            />
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
            <Badge variant="info" className="mb-2">부차 타겟</Badge>
            <EditableField 
              section="targetAudience.secondary" 
              value={strategy.targetAudience.secondary} 
            />
          </div>
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
            <Badge variant="warning" className="mb-2">Pain Point</Badge>
            <EditableField 
              section="targetAudience.painPoint" 
              value={strategy.targetAudience.painPoint} 
            />
          </div>
        </CardContent>
      </Card>

      {/* Hook Selection */}
      <Card variant={selectedHook !== undefined ? 'highlight' : 'default'}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[var(--accent-primary)]" />
              Hook 선택
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={addNewHook}
                disabled={loading || regeneratingSection !== null}
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                추가
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onRegenerateSection('hooks')}
                disabled={loading || regeneratingSection !== null}
                loading={regeneratingSection === 'hooks'}
                icon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                재생성
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {strategy.hooks.map((hook, index) => {
            const isEditingHook = editingSection === `hook.${index}`;
            
            return (
              <div
                key={index}
                className={`
                  relative rounded-lg transition-all
                  ${selectedHook === index && !isEditingHook
                    ? 'bg-[var(--accent-primary)]/20 border-2 border-[var(--accent-primary)]' 
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-tertiary)]'
                  }
                `}
              >
                {isEditingHook ? (
                  <div className="p-4 space-y-3">
                    <Textarea
                      value={editValues[`hook.${index}`] || ''}
                      onChange={(e) => setEditValues({ ...editValues, [`hook.${index}`]: e.target.value })}
                      rows={3}
                      className="text-sm"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEditing(`hook.${index}`)} icon={<Check className="w-3 h-3" />}>
                        저장
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditing} icon={<X className="w-3 h-3" />}>
                        취소
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => onSelectHook(index)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                        ${selectedHook === index 
                          ? 'bg-[var(--accent-primary)] text-[var(--bg-primary)]' 
                          : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'
                        }
                      `}>
                        {index + 1}
                      </span>
                      <p className={`
                        text-sm leading-relaxed flex-1
                        ${selectedHook === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}
                      `}>
                        {hook}
                      </p>
                    </div>
                  </button>
                )}
                
                {/* Edit/Delete buttons */}
                {!isEditingHook && (
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditing(`hook.${index}`, hook);
                      }}
                      className="p-1.5 rounded hover:bg-[var(--bg-hover)] transition-colors"
                      title="편집"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                    </button>
                    {strategy.hooks.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeHook(index);
                        }}
                        className="p-1.5 rounded hover:bg-[var(--error)]/20 transition-colors"
                        title="삭제"
                      >
                        <X className="w-3.5 h-3.5 text-[var(--error)]" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Value Proposition */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-[var(--accent-primary)]" />
              핵심 가치
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onRegenerateSection('valueProposition')}
              disabled={loading || regeneratingSection !== null}
              loading={regeneratingSection === 'valueProposition'}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              재생성
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
            <EditableField 
              section="valueProposition" 
              value={strategy.valueProposition}
              multiline
            />
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[var(--accent-primary)]" />
              CTA (Call to Action)
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onRegenerateSection('cta')}
              disabled={loading || regeneratingSection !== null}
              loading={regeneratingSection === 'cta'}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              재생성
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-3 rounded-lg bg-[var(--bg-secondary)]">
            <EditableField 
              section="cta" 
              value={strategy.cta}
              multiline
            />
          </div>
        </CardContent>
      </Card>

      {/* Approve Button */}
      <div className="flex justify-end pt-4">
        <Button 
          onClick={onApprove} 
          disabled={selectedHook === undefined || loading || regeneratingSection !== null}
          loading={loading && regeneratingSection === null}
          icon={<ArrowRight className="w-4 h-4" />}
          className="px-8"
        >
          이 기획안으로 진행
        </Button>
      </div>
    </div>
  );
}
