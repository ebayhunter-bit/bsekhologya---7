import { Link, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Brain,
  CalendarDays,
  MessageSquareCode,
  Zap,
  LogIn,
  LogOut,
  User,
} from "lucide-react";

export function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: "/", label: "Dashboard", icon: LayoutDashboard },
    { path: "/test", label: "Mock Tests", icon: Brain },
    { path: "/study-plan", label: "30-Day Course", icon: CalendarDays },
    { path: "/tutor", label: "AI Tutor", icon: MessageSquareCode },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#050505]/90 backdrop-blur-md border-b border-[rgba(255,255,255,0.06)]">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-[#9eff00]/10 flex items-center justify-center group-hover:bg-[#9eff00]/20 transition-colors">
            <Zap className="w-4 h-4 text-[#9eff00]" />
          </div>
          <span className="font-[Space_Grotesk] font-medium text-[#f5f5f5] text-sm tracking-tight">
            Aptitude Architect
          </span>
        </Link>

        {/* Center Nav */}
        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-[#9eff00]/10 text-[#9eff00]"
                    : "text-[#737373] hover:text-[#f5f5f5] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#9eff00]/10 border border-[#9eff00]/20">
                <Zap className="w-3 h-3 text-[#9eff00]" />
                <span className="text-xs font-mono text-[#9eff00]">
                  Streak Active
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#a855f7]/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-[#a855f7]" />
                </div>
                <span className="text-xs text-[#737373] hidden sm:block">
                  {user.name || "Student"}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="p-2 rounded-lg text-[#737373] hover:text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#9eff00]/10 text-[#9eff00] text-xs font-medium hover:bg-[#9eff00]/20 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
