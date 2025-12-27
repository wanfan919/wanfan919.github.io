export enum PACAState {
  PLAN = 'PLAN',
  ACT = 'ACT',
  CHECK = 'CHECK',
  AWARD = 'AWARD'
}

export interface Task {
  id: string;
  parentId?: string; // For grouping
  groupTitle?: string; // Main plan title
  groupColor?: string; // Visual grouping
  title: string;
  duration: number; // in minutes
  completed: boolean;
  category: 'work' | 'study' | 'health' | 'other';
  points: number; // AI assigned score
  createdAt: number;
}

export interface Session {
  id: string;
  taskId: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
}

export interface UserStats {
  points: number;
  level: number;
  streak: number;
  totalFocusTime: number; // minutes
}

export enum TimerMode {
  FOCUS = 'FOCUS',
  SHORT_BREAK = 'SHORT',
  LONG_BREAK = 'LONG'
}

export type Theme = 'dark' | 'light';
export type Language = 'en' | 'zh';

export const Translations = {
  en: {
    plan: 'PLAN',
    act: 'ACT',
    check: 'CHECK',
    award: 'AWARD',
    aiProtocol: 'AI Protocol',
    manualEntry: 'Manual Override',
    missionLog: 'Mission Log',
    analyze: 'Analyze Plan',
    generate: 'Initiate Sync',
    computing: 'Computing...',
    dailySummary: 'Daily Summary',
    theme: 'Theme',
    lang: 'Language'
  },
  zh: {
    plan: '计划',
    act: '执行',
    check: '检查',
    award: '奖励',
    aiProtocol: 'AI 协议',
    manualEntry: '手动覆写',
    missionLog: '任务日志',
    analyze: '分析计划',
    generate: '启动同步',
    computing: '计算中...',
    dailySummary: '今日总结',
    theme: '主题',
    lang: '语言'
  }
};