// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import { Toaster } from "react-hot-toast";
import "./index.css";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import clsx from "clsx";

ModuleRegistry.registerModules([AllCommunityModule]);

import Sidebar from "./components/Sidebar";
import Overview from "./pages/Overview";
import Products from "./pages/Products";
import Bestsellers from "./pages/Bestsellers";
import NewArrivals from "./pages/NewArrivals";
import CompetitorView from "./pages/CompetitorView";
import Trends from "./pages/Trends";
import Exports from "./pages/Exports";
import ScrapeLogs from "./pages/ScrapeLogs";
import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 mins
      retry: 1,
    },
  },
});

import { useLocation } from "react-router-dom";

function Layout() {
  const location = useLocation();
  const isOverview = location.pathname === "/overview";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main 
        className={clsx(
          "flex-1 flex flex-col h-full overflow-y-auto overflow-x-hidden relative transition-all duration-500",
          isOverview ? "bg-transparent pt-4 px-8 pb-8" : "bg-slate-50 p-8"
        )}
        style={isOverview ? {
          backgroundImage: "linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.2)), url('/images/overview-background.png')",
          backgroundSize: "100% auto",
          backgroundPosition: "left top",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed"
        } : {}}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<ProtectedRoute><Overview /></ProtectedRoute>} />
          <Route path="/market-catalog" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/bestsellers" element={<ProtectedRoute><Bestsellers /></ProtectedRoute>} />
          <Route path="/new-arrivals" element={<ProtectedRoute><NewArrivals /></ProtectedRoute>} />
          <Route path="/competitors" element={<ProtectedRoute><CompetitorView /></ProtectedRoute>} />
          <Route path="/trends" element={<ProtectedRoute><Trends /></ProtectedRoute>} />
          <Route path="/exports" element={<ProtectedRoute><Exports /></ProtectedRoute>} />
          <Route path="/scrape-monitor" element={<ProtectedRoute><ScrapeLogs /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={<Layout />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#1e293b",
              color: "#fff",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
