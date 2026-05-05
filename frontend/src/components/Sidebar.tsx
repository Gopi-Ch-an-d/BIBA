import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  FileDown,
  Radio,
  BarChart3,
  Settings,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  LogOut,
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../services/api";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
    { to: "/competitors", icon: Radio, label: "Competitors" },
  { to: "/market-catalog", icon: Package, label: "Market Catalog" },
  { to: "/new-arrivals", icon: BarChart3, label: "New Arrivals" },
  { to: "/bestsellers", icon: TrendingUp, label: "Bestsellers" },
  { to: "/trends", icon: Activity, label: "Trend Analysis" },
  { to: "/exports", icon: FileDown, label: "Export Engine" },
  { to: "/scrape-monitor", icon: Activity, label: "Scrape Monitor" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col bg-white border-r border-slate-100 shrink-0 transition-all duration-300 no-print",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Brand & Toggle */}
      <div
        className={clsx(
          "flex h-20 items-center px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <img
            src="/images/biba.png"
            alt="BIBA"
            className="h-20 w-auto object-contain"
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors",
                collapsed && "justify-center",
                isActive
                  ? "text-[#c0392b]"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              )
            }
            style={({ isActive }) =>
              isActive
                ? { backgroundColor: "rgba(192, 57, 43, 0.08)" }
                : {}
            }
          >
            {({ isActive }) => (
              <motion.div 
                className="flex items-center gap-3 w-full"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && (
                  <span className="whitespace-nowrap flex-1">{label}</span>
                )}
                {/* Active dot indicator */}
                {isActive && !collapsed && (
                  <motion.span
                    layoutId="active-dot"
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: "#c0392b" }}
                  />
                )}
                {isActive && collapsed && (
                  <motion.span
                    layoutId="active-dot-collapsed"
                    className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: "#c0392b" }}
                  />
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Minimal status footer & Logout */}
      <div className="px-3 py-4 border-t border-slate-100 space-y-2">
        <button
          onClick={() => authService.logout()}
          className={clsx(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-bold text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 pt-2 opacity-50">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">System Live</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;