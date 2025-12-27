import React, { useState, useEffect } from 'react';
import ParticleBackground from './components/ParticleBackground';
import PlanSection from './components/PlanSection';
import ActSection from './components/ActSection';
import CheckSection from './components/CheckSection';
import AwardSection from './components/AwardSection';
import { PACAState, Task, UserStats, Session, Theme, Language, Translations } from './types';
import { Layout, PlayCircle, BarChart, Trophy, Sun, Moon, Languages } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<PACAState>(PACAState.PLAN);
  
  // App Settings
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLang] = useState<Language>('en');

  // App State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<UserStats>({
    points: 1250,
    level: 3,
    streak: 2,
    totalFocusTime: 450
  });

  const t = Translations[lang];

  const handleSessionComplete = (duration: number) => {
    setStats(prev => ({
      ...prev,
      points: prev.points + (duration * 10),
      totalFocusTime: prev.totalFocusTime + duration
    }));
    setSessions(prev => [...prev, {
      id: Date.now().toString(),
      taskId: 'unknown',
      startTime: Date.now() - (duration * 60000),
      endTime: Date.now(),
      duration: duration * 60
    }]);
    setCurrentView(PACAState.AWARD);
  };

  const navItems = [
    { id: PACAState.PLAN, icon: Layout, label: t.plan },
    { id: PACAState.ACT, icon: PlayCircle, label: t.act },
    { id: PACAState.CHECK, icon: BarChart, label: t.check },
    { id: PACAState.AWARD, icon: Trophy, label: t.award },
  ];

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const toggleLang = () => setLang(prev => prev === 'en' ? 'zh' : 'en');

  return (
    <div className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500
      ${theme === 'dark' ? 'bg-[#020617] text-slate-200' : 'bg-slate-50 text-slate-800'}
    `}>
      {/* CSS Variables for Theming */}
      <style>{`
        :root {
          --color-primary: ${theme === 'dark' ? '34, 211, 238' : '59, 130, 246'}; /* Cyan / Blue */
          --color-primary-hex: ${theme === 'dark' ? '#22d3ee' : '#3b82f6'};
          --color-secondary: ${theme === 'dark' ? '168, 85, 247' : '249, 115, 22'}; /* Purple / Orange */
          --color-secondary-hex: ${theme === 'dark' ? '#a855f7' : '#f97316'};
        }
        .bg-theme-surface { background-color: ${theme === 'dark' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.7)'}; }
        .bg-theme-bg { background-color: ${theme === 'dark' ? '#020617' : '#f8fafc'}; }
        .border-theme-border { border-color: ${theme === 'dark' ? 'rgba(51, 65, 85, 0.5)' : 'rgba(203, 213, 225, 0.8)'}; }
        .text-theme-text { color: ${theme === 'dark' ? '#e2e8f0' : '#1e293b'}; }
        .text-theme-muted { color: ${theme === 'dark' ? '#94a3b8' : '#64748b'}; }
        .text-theme-primary { color: rgb(var(--color-primary)); }
        .text-theme-secondary { color: rgb(var(--color-secondary)); }
        .bg-theme-highlight { background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}; }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(var(--color-primary), 0.3);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(var(--color-primary), 0.6);
        }
      `}</style>

      <ParticleBackground theme={theme} />
      
      {/* Header / Nav */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-theme-border bg-theme-bg/80 backdrop-blur-md transition-colors">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-theme-primary to-theme-secondary rounded-lg rotate-45 flex items-center justify-center shadow-lg">
              <div className="w-5 h-5 bg-theme-bg -rotate-45 rounded-sm" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold tracking-widest text-theme-text leading-none">
                PACA
              </h1>
              <span className="text-theme-primary text-xs font-bold tracking-[0.3em] opacity-80 uppercase block">Chrono Sync</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex gap-2 bg-theme-surface p-1.5 rounded-xl border border-theme-border shadow-lg">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg transition-all font-display font-bold tracking-wide text-sm ${
                  currentView === item.id 
                  ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/30 shadow-[0_0_15px_rgba(var(--color-primary),0.2)]' 
                  : 'text-theme-muted hover:text-theme-text hover:bg-theme-highlight'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="p-3 rounded-full hover:bg-theme-highlight text-theme-muted hover:text-theme-text transition-all border border-transparent hover:border-theme-border">
              <Languages className="w-6 h-6" />
            </button>
            <button onClick={toggleTheme} className="p-3 rounded-full hover:bg-theme-highlight text-theme-muted hover:text-theme-text transition-all border border-transparent hover:border-theme-border">
              {theme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 pt-28 pb-16 px-6 max-w-[1600px] mx-auto h-screen flex flex-col">
        <div className="flex-1 min-h-0"> 
          <div className="h-full animate-fade-in-up">
            {currentView === PACAState.PLAN && <PlanSection tasks={tasks} setTasks={setTasks} lang={lang} />}
            {currentView === PACAState.ACT && <ActSection tasks={tasks} onSessionComplete={handleSessionComplete} />}
            {currentView === PACAState.CHECK && <CheckSection tasks={tasks} sessions={sessions} lang={lang} />}
            {currentView === PACAState.AWARD && <AwardSection stats={stats} />}
          </div>
        </div>
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 w-full z-50 border-t border-theme-border bg-theme-bg/90 backdrop-blur text-sm font-mono text-theme-muted">
        <div className="max-w-[1600px] mx-auto px-6 h-10 flex items-center justify-between">
          <div className="flex gap-6">
             <span className="flex items-center gap-2 text-emerald-500 font-bold">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               SYSTEM ONLINE
             </span>
             <span className="opacity-50">VER 3.0.0</span>
          </div>
          <div className="flex gap-6">
            <span className="text-theme-secondary font-bold">XP: {stats.points}</span>
            <span className="uppercase">OPERATOR: COMMANDER</span>
          </div>
        </div>
      </footer>
      
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-fade-in-up { animation: fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
        
        .typing-effect {
          border-right: 3px solid rgb(var(--color-primary));
          white-space: pre-wrap;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { border-color: transparent; } }
      `}</style>
    </div>
  );
};

export default App;