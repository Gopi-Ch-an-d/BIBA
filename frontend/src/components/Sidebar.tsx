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
import { motion } from "framer-motion";
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
        "flex h-screen flex-col shrink-0 transition-all duration-300 no-print border-r",
        collapsed ? "w-16" : "w-60"
      )}
      style={{
        background: "#F8F5F5",
        borderColor: "#EFDCDC",
      }}
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
          className="p-2 rounded-lg transition-colors"
          style={{
            color: "#B89B9B",
          }}
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
                collapsed && "justify-center",
                isActive
                  ? "text-[#c0392b]"
                  : "text-slate-500 hover:text-slate-800"
              )
            }
            style={({ isActive }) =>
              isActive
                ? {
                    background:
                      "linear-gradient(135deg, rgba(231,185,185,0.22), rgba(248,245,245,0.9))",
                    boxShadow: "0 2px 8px rgba(231,185,185,0.15)",
                  }
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
                  <span className="whitespace-nowrap flex-1">
                    {label}
                  </span>
                )}

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

      {/* Footer */}
      <div
        className="px-3 py-4 space-y-2"
        style={{
          borderTop: "1px solid #EFDCDC",
        }}
      >
        <button
          onClick={() => authService.logout()}
          className={clsx(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all",
            collapsed && "justify-center"
          )}
          style={{
            color: "#B89B9B",
          }}
        >
          <LogOut size={18} />

          {!collapsed && <span>Logout</span>}
        </button>

        {!collapsed && (
          <div className="flex items-center gap-2 px-3 pt-2 opacity-70">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: "#B89B9B" }}
            >
              System Live
            </span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;