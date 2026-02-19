import React, { useState } from 'react';
import {
  LayoutDashboard, Film, Users, Settings, Home, LogOut,
  Tags, CreditCard, Calendar, MessageSquare, ChevronDown, ChevronRight, Menu, X, FileText, Database
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import UsersModule from './UsersModule';
import ContentManager from './modules/ContentManager';
import SectionManager from './modules/SectionManager';
import SettingsManager from './modules/SettingsManager';
import AnalyticsManager from './modules/AnalyticsManager';
import PlanManager from './modules/PlanManager';
import ComingSoonManager from './modules/ComingSoonManager';
import RequestsManager from './modules/RequestsManager';
import PagesManager from './modules/PagesManager';
import AppearanceManager from './modules/AppearanceManager';
import AnimeManager from './modules/AnimeManager';
import ExportManager from './modules/ExportManager';

// --- Types ---
type ModuleType = 'dashboard' | 'content' | 'anime' | 'home' | 'coming_soon' | 'requests' | 'plans' | 'users' | 'settings' | 'pages' | 'appearance' | 'export';

interface SidebarGroup {
  title: string;
  items: { id: ModuleType; label: string; icon: any }[];
}

// --- Configuration ---
const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Analytics Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    title: 'Content Management',
    items: [
      { id: 'content', label: 'Content Library', icon: Film },
      { id: 'anime', label: 'Anime Library', icon: Film },
      { id: 'home', label: 'Sections & Layout', icon: Home },
      { id: 'pages', label: 'Pages & Footer', icon: FileText },
      { id: 'coming_soon', label: 'Upcoming Releases', icon: Calendar },
      { id: 'requests', label: 'User Requests', icon: MessageSquare },
    ]
  },
  {
    title: 'Business',
    items: [
      { id: 'users', label: 'User Management', icon: Users },
      { id: 'plans', label: 'Subscription Plans', icon: CreditCard },
    ]
  },
  {
    title: 'System',
    items: [
      { id: 'appearance', label: 'Appearance & Theme', icon: Tags },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'export', label: 'Import / Export', icon: Database },
    ]
  }
];

export default function AdminLayout({ onExit }: { onExit: () => void }) {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Overview', 'Content Management', 'Business', 'System']);
  const [showExitModal, setShowExitModal] = useState(false);

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  const getBreadcrumb = () => {
    const group = SIDEBAR_GROUPS.find(g => g.items.some(i => i.id === activeModule));
    const item = group?.items.find(i => i.id === activeModule);
    return `${group?.title} > ${item?.label}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex relative font-sans">

      {/* Mobile Header Overlay Trigger */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#141414] border-b border-white/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-gray-400 hover:text-white">
            <Menu size={24} />
          </button>
          <span className="font-bold">Admin Panel</span>
        </div>
        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-6 w-auto" alt="Logo" />
      </div>

      {/* Sidebar Backdrop (Mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] md:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#141414] border-r border-white/10 flex flex-col z-[70] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Sidebar Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div>
            <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-8 w-auto object-contain mb-1" alt="DONKEY ADMIN" />
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Consigliere Mode</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400"><X size={20} /></button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-3 space-y-6">
          {SIDEBAR_GROUPS.map((group) => (
            <div key={group.title}>
              <button
                onClick={() => toggleGroup(group.title)}
                className="w-full flex items-center justify-between px-2 py-1 mb-1 text-xs font-bold text-gray-500 uppercase tracking-widest hover:text-gray-300 transition-colors"
              >
                {group.title}
                {expandedGroups.includes(group.title) ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {expandedGroups.includes(group.title) && (
                <div className="space-y-1 animate-in slide-in-from-left-2 duration-200">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setActiveModule(item.id); setSidebarOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-all text-sm font-medium ${activeModule === item.id
                        ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                        }`}
                    >
                      <item.icon size={18} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-white/5 text-[10px] text-gray-600 text-center">
          v2.5.0 • Stable Build
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-black/95">

        {/* Top Header */}
        <header className="h-16 border-b border-white/10 bg-[#141414]/50 backdrop-blur-md flex items-center justify-between px-6 md:px-8 mt-16 md:mt-0">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span className="text-gray-600">Admin</span>
            <ChevronRight size={14} />
            <span className="text-white font-medium">{getBreadcrumb()}</span>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExitModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-gray-300 transition text-sm font-medium border border-white/5 hover:border-red-500/50"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">Exit Admin</span>
            </button>
          </div>
        </header>

        {/* Scrollable Module Viewer */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto animate-in fade-in duration-300">
            {activeModule === 'dashboard' && <AnalyticsManager />}
            {activeModule === 'content' && <ContentManager />}
            {activeModule === 'anime' && <AnimeManager />}
            {activeModule === 'home' && <SectionManager />}
            {activeModule === 'coming_soon' && <ComingSoonManager />}
            {activeModule === 'plans' && <PlanManager />}
            {activeModule === 'users' && <UsersModule />}
            {activeModule === 'settings' && <SettingsManager />}
            {activeModule === 'requests' && <RequestsManager />}

            {activeModule === 'pages' && <PagesManager />}
            {activeModule === 'appearance' && <AppearanceManager />}
            {activeModule === 'export' && <ExportManager />}
          </div>
        </main>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#181818] border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl scale-100 animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-2 text-white">Exit Admin Panel?</h3>
            <p className="text-gray-400 mb-6 text-sm">You will be returned to the main application. Any unsaved changes may be lost.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded text-gray-300 hover:text-white hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                onClick={onExit}
                className="px-4 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition"
              >
                Exit Admin
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
