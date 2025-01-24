'use client';

import { useState } from 'react';
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Library, Target, Users, LayoutDashboard, Cog, Settings, LogOut } from 'lucide-react';
import { AccountSettingsModal } from './account-settings-modal';

interface NavItemProps {
  href?: string;
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}

const NavItem = ({ href, icon: Icon, label, isActive, onClick }: NavItemProps) => {
  const content = (
    <>
      <Icon className="w-5 h-5 shrink-0" strokeWidth={1.5} />
      <span className="font-medium">{label}</span>
    </>
  );

  const className = cn(
    "flex items-center gap-4 px-4 py-2.5 transition-colors text-[15px]",
    isActive ? "bg-[#F5A524] text-white rounded-full" : "text-gray-300 hover:text-white"
  );

  if (onClick) {
    return (
      <button className={className} onClick={onClick}>
        {content}
      </button>
    );
  }

  return (
    <Link href={href!} className={className}>
      {content}
    </Link>
  );
};

const MainSidebar = () => {
  const pathname = usePathname();
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  return (
    <>
      <aside className="flex flex-col h-screen w-64 bg-[#1E1E1E] fixed">
        {/* Logo */}
        <div className="px-4 pt-6 pb-8">
          <h1 className="text-[28px] font-semibold text-white tracking-tight">LeaderForge</h1>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-2 space-y-8">
          {/* LEARNING Section */}
          <div>
            <h2 className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              LEARNING
            </h2>
            <div className="space-y-1">
              <NavItem 
                href="/" 
                icon={BookOpen} 
                label="Home" 
                isActive={pathname === '/'} 
              />
              <NavItem 
                href="/training-library" 
                icon={Library} 
                label="Learning Library" 
                isActive={pathname === '/training-library'} 
              />
              <NavItem 
                href="/bold-actions" 
                icon={Target} 
                label="Bold Actions" 
                isActive={pathname === '/bold-actions'} 
              />
            </div>
          </div>

          {/* OVERVIEW Section */}
          <div>
            <h2 className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              OVERVIEW
            </h2>
            <div className="space-y-1">
              <NavItem 
                href="/my-team" 
                icon={Users} 
                label="My Team" 
                isActive={pathname === '/my-team'} 
              />
              <NavItem 
                href="/executive" 
                icon={LayoutDashboard} 
                label="Executive Overview" 
                isActive={pathname === '/executive'} 
              />
            </div>
          </div>

          {/* SETTINGS Section */}
          <div>
            <h2 className="px-4 text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
              SETTINGS
            </h2>
            <div className="space-y-1">
              <NavItem 
                href="/company-settings" 
                icon={Cog} 
                label="Company Settings" 
                isActive={pathname === '/company-settings'} 
              />
              <NavItem 
                icon={Settings} 
                label="Account Settings" 
                onClick={() => setIsAccountModalOpen(true)}
              />
            </div>
          </div>
        </nav>

        {/* Sign Out Button */}
        <div className="p-4">
          <button 
            className="flex items-center gap-4 w-full px-4 py-2.5 text-gray-300 hover:text-white transition-colors text-[15px] font-medium"
            onClick={() => {/* Add sign out logic */}}
          >
            <LogOut className="w-5 h-5 shrink-0" strokeWidth={1.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <AccountSettingsModal 
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </>
  );
};

export default MainSidebar;

