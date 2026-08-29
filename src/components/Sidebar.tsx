"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Users,
  CalendarDays,
  CheckSquare,
  Home,
  Heart,
  Bell,
  UserSearch,
  ChevronRight,
  BookOpen,
  Library,
  X,
  Menu,
  LogOut,
  User,
  Crown,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";

const servantNavItems = [
  { href: "/", label: "الرئيسية", icon: Home },
  { href: "/meetings", label: "الاجتماعات", icon: CalendarDays },
  { href: "/attendance", label: "تسجيل الحضور", icon: CheckSquare },
  { href: "/members", label: "قاعدة الشباب", icon: Users },
  { href: "/followup", label: "الافتقاد والمتابعة", icon: UserSearch },
  { href: "/agpeya", label: "صلوات الأجبية", icon: BookOpen },
  { href: "/library", label: "المكتبة والملفات", icon: Library },
  { href: "/prayers", label: "طلبات الصلاة", icon: Heart },
  { href: "/announcements", label: "الإعلانات", icon: Bell },
];

const memberNavItems = [
  { href: "/", label: "الرئيسية (كارت الحضور)", icon: Home },
  { href: "/agpeya", label: "صلوات الأجبية", icon: BookOpen },
  { href: "/library", label: "المكتبة والملفات", icon: Library },
  { href: "/meetings", label: "جدول الاجتماعات", icon: CalendarDays },
  { href: "/prayers", label: "طلبات الصلاة", icon: Heart },
  { href: "/announcements", label: "الإعلانات", icon: Bell },
];

interface SidebarInnerProps {
  user: any;
  role: string | null;
  navItems: { href: string; label: string; icon: any }[];
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
}

function SidebarInner({ user, role, navItems, pathname, onNavigate, onLogout }: SidebarInnerProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-amber-700/30">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 relative rounded-full overflow-hidden border-2 border-amber-400/80 shadow-md bg-amber-950 flex-shrink-0 flex items-center justify-center p-1">
            <Image
              src="/logo.png"
              alt="شعار اجتماع الشباب"
              fill
              className="object-contain p-0.5"
              priority
            />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">منقوش على كفك</h1>
            <p className="text-amber-300 text-xs">كنيسة العذراء - العاشر من رمضان</p>
          </div>
        </div>

        {/* User Info Badge */}
        {user && (
          <div className="mt-3 p-2.5 bg-amber-900/60 rounded-xl border border-amber-700/40 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                <User size={14} />
              </div>
              <div className="truncate">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <span className="text-[10px] text-amber-300 bg-amber-800/80 px-1.5 py-0.5 rounded">
                  {role === "servant" ? "خادم ✝️" : "مخدوم 👤"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                active
                  ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30 font-semibold"
                  : "text-amber-200 hover:bg-amber-800/50 hover:text-white"
              }`}
            >
              <Icon size={18} className={active ? "text-white" : "text-amber-400 group-hover:text-amber-200"} />
              <span className="text-sm">{item.label}</span>
              {active && <ChevronRight size={14} className="mr-auto opacity-70 rotate-180" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer & Logout */}
      <div className="p-4 border-t border-amber-700/30 space-y-3">
        {user ? (
          <button
            onClick={() => {
              onNavigate();
              onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-800/60 text-red-200 hover:text-white py-2.5 px-4 rounded-xl text-xs font-medium transition-colors border border-red-700/30 cursor-pointer"
          >
            <LogOut size={15} />
            تسجيل الخروج
          </button>
        ) : null}
        <p className="text-amber-400/80 text-[11px] text-center">
          🙏 ربنا يبارك خدمتكم
        </p>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role, logout } = useAuth();

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isAdmin = role === "servant" && (user as any)?.servantRole === "admin";
  const baseServantItems = servantNavItems;
  const navItems = role === "member"
    ? memberNavItems
    : isAdmin
      ? [...baseServantItems, { href: "/servants", label: "إدارة الخدام", icon: Crown }]
      : baseServantItems;

  // Hide sidebar completely on full-screen viewer pages
  if (pathname.startsWith("/library/view")) {
    return null;
  }

  return (
    <>
      {/* ── Mobile Top Sticky Navbar (Never overlaps page contents) ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 text-white border-b border-amber-800/60 z-40 flex items-center justify-between px-4 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 relative rounded-full overflow-hidden border border-amber-400 bg-amber-950 flex-shrink-0">
            <Image src="/logo.png" alt="Logo" fill className="object-contain p-0.5" priority />
          </div>
          <div>
            <span className="font-black text-xs text-white block leading-tight">منقوش على كفك</span>
            <span className="text-[10px] text-amber-300 block">اجتماع الشباب</span>
          </div>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 bg-amber-800/80 hover:bg-amber-700 active:scale-95 text-white rounded-xl flex items-center justify-center border border-amber-600/50 shadow-sm cursor-pointer"
          aria-label="فتح القائمة الرئيسية"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* ── Mobile Backdrop Overlay ── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-50 backdrop-blur-xs transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Off-Canvas Drawer (RTL Compliant) ── */}
      <div
        className={`lg:hidden fixed top-0 right-0 h-full w-72 z-50 transition-all duration-300 shadow-2xl flex flex-col ${
          mobileOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none"
        }`}
        style={{ background: "linear-gradient(180deg, #3d2200 0%, #2d1a00 100%)" }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 left-4 p-1.5 text-amber-300 hover:text-white bg-amber-900/60 rounded-xl border border-amber-700/50 cursor-pointer z-10"
          aria-label="إغلاق القائمة"
        >
          <X size={20} />
        </button>
        <SidebarInner
          user={user}
          role={role}
          navItems={navItems}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onLogout={logout}
        />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-64 min-h-screen fixed right-0 top-0 z-30"
        style={{ background: "linear-gradient(180deg, #3d2200 0%, #2d1a00 100%)" }}
      >
        <SidebarInner
          user={user}
          role={role}
          navItems={navItems}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onLogout={logout}
        />
      </aside>
    </>
  );
}
