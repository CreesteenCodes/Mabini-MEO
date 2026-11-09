import { LayoutDashboard, Building2, ClipboardCheck, Wrench, Brain, FileText, LogOut, User, ChevronRight } from 'lucide-react';
import logoImage from '../../imports/logo.png';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: string;
  userName: string;
  onLogout: () => void;
}

export function Sidebar({ activeTab, onTabChange, userRole, userName, onLogout }: SidebarProps) {
  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Head Engineer', 'Admin', 'Staff - Encoder', 'Staff - Validator', 'Staff - Inspector'] },
    { id: 'analytics', label: 'Analytics', icon: FileText, roles: ['Head Engineer', 'Admin'] },
    { id: 'project-management', label: 'Project Management', icon: Building2, roles: ['Head Engineer', 'Admin', 'Staff - Encoder'] },
    { id: 'inspection-management', label: 'Inspection Management', icon: ClipboardCheck, roles: ['Head Engineer', 'Admin', 'Staff - Inspector'] },
    { id: 'maintenance-management', label: 'Maintenance Management', icon: Wrench, roles: ['Head Engineer', 'Admin', 'Staff - Encoder'] },
    { id: 'validation-management', label: 'Validation Management', icon: FileText, roles: ['Staff - Validator'] },
    { id: 'ai', label: 'AI Recommendation', icon: Brain, roles: ['Head Engineer', 'Admin'] },
    { id: 'system-management', label: 'System Management', icon: User, roles: ['Head Engineer', 'Admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="flex h-screen w-[270px] shrink-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(65,110,220,0.38),_transparent_38%),linear-gradient(180deg,#0d2d6d_0%,#0f2e73_100%)] px-3 py-3 text-white shadow-[0_20px_60px_rgba(7,15,35,0.45)]">
      <div className="mb-4 flex flex-col items-center px-1 pt-1 text-center">
        <div className="mb-2 flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-[0_0_0_4px_rgba(255,255,255,0.04)]">
          <img src={logoImage.src} alt="Logo" className="h-full w-full object-cover" />
        </div>
        <div className="leading-tight">
          <h1 className="text-sm font-semibold tracking-tight">Office of the Municipal Engineer</h1>
        </div>
      </div>

      <div className="mb-3 rounded-[16px] border border-white/15 bg-white/8 px-3 py-2.5 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-[#dbe8ff]/10 text-white/90 shadow-inner shadow-white/5">
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 max-w-full">
            <p className="truncate text-sm font-semibold text-white">{userName || 'Admin User'}</p>
            <p className="text-xs text-sky-100/70">{userRole || 'Head Engineer'}</p>
          </div>
        </div>
      </div>

      <nav className="mt-0.5 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`group relative flex w-full items-center gap-3 rounded-[16px] px-3 py-2 text-left transition-all duration-200 ${
                isActive
                  ? 'border border-white/20 bg-[#eaf2ff]/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                  : 'text-sky-50/90 hover:bg-white/5 hover:text-white'
              }`}
            >
              {isActive && (
                <span className="absolute bottom-2 left-0 top-2 w-1 rounded-full bg-sky-200 shadow-[0_0_10px_rgba(186,230,253,0.9)]" />
              )}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${isActive ? 'bg-white/12 text-white' : 'text-sky-100/90'}`}>
                <Icon className="h-[18px] w-[18px]" />
              </div>

              <span className="flex-1 whitespace-nowrap text-sm font-medium tracking-[0.01em] text-white/95">{item.label}</span>

              {isActive && <ChevronRight className="h-4 w-4 text-sky-100/75" />}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 shrink-0 border-t border-white/10 pt-2">
        <button
          onClick={onLogout}
          className="group flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2 text-left text-sm font-medium text-sky-50/90 transition hover:bg-red-500/20 hover:text-red-100"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-sky-50/80 transition-colors group-hover:bg-red-500/25 group-hover:text-red-100">
            <LogOut className="h-[18px] w-[18px]" />
          </div>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
