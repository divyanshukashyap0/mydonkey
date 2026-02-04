import React, { useState } from 'react';
import { LayoutDashboard, Film, Users, Settings, Home, LogOut, Tags, CreditCard, Calendar } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import UsersModule from './UsersModule';
import ContentManager from './modules/ContentManager';
import SectionManager from './modules/SectionManager';
import SettingsManager from './modules/SettingsManager';
import AnalyticsManager from './modules/AnalyticsManager';
import PlanManager from './modules/PlanManager';
import ComingSoonManager from './modules/ComingSoonManager';

export default function AdminLayout({ onExit }: { onExit: () => void }) {
  const [activeModule, setActiveModule] = useState<'dashboard' | 'content' | 'users' | 'home' | 'settings' | 'plans' | 'coming_soon'>('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex relative">

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#141414] border-b border-white/10 z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2 -ml-2">
            <LayoutDashboard size={24} />
          </button>
          <span className="font-bold">Admin Panel</span>
        </div>
        <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-6 w-auto" alt="Logo" />
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-[#141414] border-r border-white/10 flex flex-col z-[70] transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 hidden md:block">
          <img src="https://res.cloudinary.com/dpba1gvra/image/upload/v1770155013/logo_mgcysp.png" className="h-10 w-auto object-contain mb-1" alt="DONKEY ADMIN Logo" />
          <p className="text-xs text-gray-500">Super Admin Console</p>
        </div>

        {/* Mobile Sidebar Header */}
        <div className="md:hidden p-6 flex justify-between items-center border-b border-white/10">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={() => setSidebarOpen(false)}><LogOut size={20} className="rotate-180" /></button>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar pt-4 md:pt-0">
          {[
            { id: 'dashboard', label: 'Analytics & Overview', icon: LayoutDashboard },
            { id: 'content', label: 'Content Manager', icon: Film },
            { id: 'home', label: 'Sections & Layout', icon: Home },
            { id: 'coming_soon', label: 'Upcoming Releases', icon: Calendar },
            { id: 'plans', label: 'Subscription Plans', icon: CreditCard },
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'settings', label: 'System Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveModule(item.id as any); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeModule === item.id
                ? 'bg-brand-red text-white font-bold shadow-lg shadow-brand-red/20'
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button onClick={onExit} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-lg transition">
            <LogOut size={20} />
            Exit Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-black/50 p-4 md:p-8 h-screen pt-20 md:pt-8 w-full">
        {activeModule === 'dashboard' && <AnalyticsManager />}
        {activeModule === 'content' && <ContentManager />}
        {activeModule === 'home' && <SectionManager />}
        {activeModule === 'coming_soon' && <ComingSoonManager />}
        {activeModule === 'plans' && <PlanManager />}
        {activeModule === 'users' && <UsersModule />}
        {activeModule === 'settings' && <SettingsManager />}
      </main>
    </div>
  );
}
