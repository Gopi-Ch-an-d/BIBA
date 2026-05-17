import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FileDown,
  PanelLeftClose,
  PanelLeftOpen,
  Package,
  LogOut,
  ChevronDown,
  KeyRound,
  Swords,
  Users,
  UserCog,
  Sparkles,
  Trophy,
  LineChart,
  FolderDown,
  ScanSearch,
} from "lucide-react";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../services/api";

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [masterOpen, setMasterOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const menuItems = [
    { to: "/overview", icon: LayoutDashboard, label: "Overview" },
    {
      id: "master",
      label: "Master Management",
      isHeader: true,
      children: [
        { to: "/master/roles", icon: KeyRound, label: "Roles" },
        { to: "/competitors", icon: Swords, label: "Competitors" },
      ],
    },
    {
      id: "user",
      label: "User Management",
      isHeader: true,
      children: [
        { to: "/master/users", icon: Users, label: "Users" },
        { to: "/master/employees", icon: UserCog, label: "Employees" },
      ],
    },
    { to: "/market-catalog", icon: Package, label: "Products Catalog" },
    { to: "/new-arrivals", icon: Sparkles, label: "New Arrivals" },
    { to: "/bestsellers", icon: Trophy, label: "Bestsellers" },
    { to: "/trends", icon: LineChart, label: "Trend Analysis" },
    { to: "/exports", icon: FolderDown, label: "Export Engine" },
    { to: "/scrape-monitor", icon: ScanSearch, label: "Scrape Monitor" },
  ];

  const renderLink = (item: any, isChild = false) => {
    const Icon = item.icon;
    const to = item.to;
    const label = item.label;

    return (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        className={({ isActive }) =>
          clsx(
            "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200",
            collapsed && "justify-center",
            isChild && !collapsed && "ml-4 text-[12px]",
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
            {Icon && <Icon size={isChild ? 14 : 18} className="shrink-0" />}

            {!collapsed && (
              <span className="whitespace-nowrap flex-1">{label}</span>
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
    );
  };

  return (
    <aside
      className={clsx(
        "flex h-screen flex-col shrink-0 transition-all duration-300 no-print border-r",
        collapsed ? "w-16" : "w-60"
      )}
      style={{
        background: "#FFFFFF",
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
          style={{ color: "#B89B9B" }}
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
        {menuItems.map((item) => {
          if (item.isHeader) {
            const isOpen = item.id === "master" ? masterOpen : userOpen;
            const toggle =
              item.id === "master"
                ? () => setMasterOpen(!masterOpen)
                : () => setUserOpen(!userOpen);

            return (
              <div key={item.id} className="space-y-1">
                {!collapsed && (
                  <button
                    onClick={toggle}
                    className="w-full flex justify-between items-center px-3 pt-4 pb-1 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                  >
                    {item.label}
                    <ChevronDown
                      size={12}
                      className={clsx(
                        "transition-transform duration-200",
                        isOpen ? "rotate-180" : ""
                      )}
                    />
                  </button>
                )}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1">
                        {item.children.map((child: any) =>
                          renderLink(child, true)
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return renderLink(item);
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-3 py-4"
        style={{ borderTop: "1px solid #EFDCDC" }}
      >
        <button
          onClick={() => authService.logout()}
          className={clsx(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all",
            collapsed && "justify-center"
          )}
          style={{ color: "#B89B9B" }}
        >
          <LogOut size={18} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;