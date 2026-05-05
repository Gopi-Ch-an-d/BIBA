import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import { useQuery, useQueries } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Package,
  Tag,
  IndianRupee,
  Sparkles,
  TrendingUp,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import {
  competitorService,
  productService,
  analyticsService,
} from "../services/api";
import { Competitor, CompetitorOverviewCard, Product } from "../types";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  icon: React.ElementType;
  trend?: string;
  colorClass: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  colorClass,
  onClick,
}) => {
  const isUp = trend?.startsWith("+");
  return (
    <div
      onClick={onClick}
      className={clsx(
        "bg-white border border-slate-100 rounded-xl p-5 transition-all",
        onClick &&
          "cursor-pointer hover:shadow-md hover:border-blue-100 active:scale-[0.98]",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
            {label}
          </p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-[11px] text-slate-400 mt-1">{subtext}</p>
        </div>
        <div
          className={clsx(
            "h-10 w-10 rounded-lg flex items-center justify-center",
            colorClass,
          )}
        >
          <Icon size={20} />
        </div>
      </div>
      {/* Trend indicator removed as requested */}
    </div>
  );
};

// ─── Product Detail Modal ─────────────────────────────────────────────────────
interface ProductModalProps {
  product: Product;
  competitorName: string;
  onClose: () => void;
}

const ProductModal: React.FC<ProductModalProps> = ({
  product,
  competitorName,
  onClose,
}) => {
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(4px)",
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={handleCardClick}
      >
        {/* Image header */}
        <div
          className="relative bg-slate-50 flex items-center justify-center"
          style={{ height: 220 }}
        >
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-contain p-6"
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-3 right-3 h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
          >
            <X size={14} />
          </button>
          {product.is_bestseller && (
            <span
              className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest text-white"
              style={{ backgroundColor: "#c0392b" }}
            >
              Bestseller
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2 className="text-base font-bold text-slate-900 leading-snug">
              {product.name}
            </h2>
            <span className="shrink-0 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold whitespace-nowrap mt-0.5">
              {competitorName}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mb-5">
            {product.sku}
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mb-1">
                Price
              </p>
              <p className="text-lg font-black text-slate-900">
                ₹{product.current_price?.toLocaleString()}
              </p>
              {product.original_price && (
                <p className="text-[10px] text-slate-400 line-through">
                  ₹{product.original_price?.toLocaleString()}
                </p>
              )}
            </div>
            <div className="bg-rose-50 rounded-xl p-3">
              <p className="text-[10px] text-rose-400 uppercase tracking-widest font-semibold mb-1">
                Discount
              </p>
              <p className="text-lg font-black text-rose-600">
                {product.discount_pct
                  ? `${Math.round(product.discount_pct)}%`
                  : "—"}
              </p>
              <p className="text-[10px] text-rose-300">off MRP</p>
            </div>
            <div
              className={clsx(
                "rounded-xl p-3",
                product.stock_available ? "bg-emerald-50" : "bg-slate-50",
              )}
            >
              <p
                className={clsx(
                  "text-[10px] uppercase tracking-widest font-semibold mb-1",
                  product.stock_available
                    ? "text-emerald-400"
                    : "text-slate-400",
                )}
              >
                Stock
              </p>
              <div className="flex items-center gap-1">
                {product.stock_available ? (
                  <CheckCircle
                    size={15}
                    className="text-emerald-500 shrink-0"
                  />
                ) : (
                  <XCircle size={15} className="text-slate-400 shrink-0" />
                )}
                <span
                  className={clsx(
                    "text-sm font-bold",
                    product.stock_available
                      ? "text-emerald-700"
                      : "text-slate-500",
                  )}
                >
                  {product.stock_available ? "In Stock" : "Out"}
                </span>
              </div>
            </div>
          </div>

          {/* Meta rows */}
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-slate-400">Last updated</span>
              <span className="text-slate-700 font-medium">
                {format(
                  parseISO(product.last_updated_at),
                  "MMM dd, yyyy • hh:mm a",
                )}
              </span>
            </div>
            {product.category && (
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-slate-400">Category</span>
                <span className="text-slate-700 font-medium">
                  {product.category}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[12px] font-bold hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          {product.product_url ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(
                  product.product_url,
                  "_blank",
                  "noopener,noreferrer",
                );
              }}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors"
            >
              <ExternalLink size={13} />
              View on Site
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-400 text-[12px] font-bold flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <ExternalLink size={13} />
              No URL
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Overview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: overview = [] } = useQuery<CompetitorOverviewCard[]>({
    queryKey: ["overview"],
    queryFn: competitorService.getOverview,
    refetchInterval: 2000,
  });

  const { data: competitors = [] } = useQuery<Competitor[]>({
    queryKey: ["competitors-list"],
    queryFn: competitorService.getCompetitors,
  });

  const { data: productsData } = useQuery({
    queryKey: ["products-recent-list"],
    queryFn: () => productService.listProducts({ page_size: 5 }),
    refetchInterval: 2000,
  });

  const totals = useMemo(
    () => ({
      products: overview.reduce((a, c) => a + c.total_products, 0),
      avgPrice: overview.length
        ? Math.round(
            overview.reduce((a, c) => a + (c.avg_price || 0), 0) /
              overview.length,
          )
        : 0,
      avgDiscount: overview.length
        ? (
            overview.reduce((a, c) => a + (c.avg_discount_pct || 0), 0) /
            overview.length
          ).toFixed(1)
        : "0",
      newArrivals: overview.reduce(
        (a, c) => a + (c.daily_new_products_count || 0),
        0,
      ),
    }),
    [overview],
  );

  const trendQueries = useQueries({
    queries: competitors.map((c) => ({
      queryKey: ["trend", c.id, 7],
      queryFn: () =>
        analyticsService.getPriceTrend({
          competitor_id: c.id,
          days: 7,
          is_new_launch: true,
        }),
      enabled: competitors.length > 0,
    })),
  });

  const combinedTrends = useMemo(() => {
    if (trendQueries.some((q) => q.isLoading) || trendQueries.length === 0)
      return [];
    const dateMap: Record<string, any> = {};
    trendQueries.forEach((q, i) => {
      const compName = competitors[i]?.name;
      if (!compName) return;
      q.data?.forEach((point) => {
        const dateStr = format(parseISO(point.scraped_at), "MMM dd");
        if (!dateMap[dateStr]) dateMap[dateStr] = { name: dateStr };
        dateMap[dateStr][compName] = Math.round(point.price);
      });
    });
    return Object.values(dateMap).sort(
      (a, b) => new Date(a.name).getTime() - new Date(b.name).getTime(),
    );
  }, [trendQueries, competitors]);

  const distribution = overview.map((c) => ({
    name: c.competitor_name,
    value: c.bestsellers_count,
  }));
  const totalBestsellers = distribution.reduce((a, c) => a + c.value, 0);

  const [isTriggering, setIsTriggering] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleTriggerScrape = async () => {
    try {
      setIsTriggering(true);
      await competitorService.triggerScrape();
      toast.success("Scrape task successfully queued for all competitors.", {
        icon: "🚀",
      });
    } catch {
      toast.error(
        "Failed to trigger scrape. Check if Celery/Redis is running.",
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const handleStopScrape = async () => {
    try {
      setIsStopping(true);
      await competitorService.stopScrape();
      toast.success("Scraper stopped and queue cleared.", {
        icon: "🛑",
      });
    } catch {
      toast.error("Failed to stop scraper.");
    } finally {
      setIsStopping(false);
    }
  };

  const getCompetitorName = (id: number) =>
    competitors.find((c) => c.id === id)?.name || "Unknown";

  const handleEyeClick = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedProduct(product);
  };

  return (
    <>
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          competitorName={getCompetitorName(selectedProduct.competitor_id)}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6 pb-10"
      >
        {/* ── Header ── */}
        <motion.div
          variants={itemVariants}
          className="flex items-center justify-between py-2"
        >
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Intelligence Dashboard
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-widest">
              Automated Market Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isTriggering}
              onClick={handleTriggerScrape}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 disabled:opacity-50"
            >
              {isTriggering ? (
                <Sparkles size={14} className="animate-spin" />
              ) : (
                <RefreshCw size={14} />
              )}
              Launch Scraper
            </button>
            <button
              type="button"
              disabled={isStopping}
              onClick={handleStopScrape}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 text-rose-600 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all active:scale-95 disabled:opacity-50"
            >
              <XCircle size={14} className={isStopping ? "animate-spin" : ""} />
              Stop Scraper
            </button>
          </div>
        </motion.div>

        {/* ── Stat Cards ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Total Products"
            value={totals.products.toLocaleString()}
            subtext={`Across ${competitors.length} competitors`}
            icon={Package}
            colorClass="bg-emerald-50 text-emerald-600"
            onClick={() => navigate("/market-catalog")}
          />
          <StatCard
            label="Average Price"
            value={`₹${totals.avgPrice.toLocaleString()}`}
            subtext="Market average"
            icon={IndianRupee}
            colorClass="bg-indigo-50 text-indigo-600"
          />
          <StatCard
            label="Avg Discount"
            value={`${totals.avgDiscount}%`}
            subtext="Market average"
            icon={Tag}
            colorClass="bg-amber-50 text-amber-600"
          />
          <StatCard
            label="Added Today"
            value={totals.newArrivals}
            subtext="Detected today"
            icon={Sparkles}
            colorClass="bg-blue-50 text-blue-600"
            onClick={() => navigate("/new-arrivals")}
          />
        </motion.div>

        {/* ── Charts Row ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          {/* Price Trends */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Price Trends
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={combinedTrends}
                  margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                >
                  <defs>
                    {competitors.map((c, i) => (
                      <linearGradient
                        key={c.id}
                        id={`grad-${c.name}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={COLORS[i % COLORS.length]}
                          stopOpacity={0.15}
                        />
                        <stop
                          offset="95%"
                          stopColor={COLORS[i % COLORS.length]}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "10px",
                      border: "none",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      fontSize: 11,
                    }}
                  />
                  <Legend
                    iconType="circle"
                    verticalAlign="top"
                    wrapperStyle={{ fontSize: 10, paddingBottom: 16 }}
                  />
                  {competitors.map((c, i) => (
                    <Area
                      key={c.id}
                      type="monotone"
                      dataKey={c.name}
                      stroke={COLORS[i % COLORS.length]}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#grad-${c.name})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bestseller Share */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Bestseller Share
            </p>
            <div className="h-56 relative">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={distribution}
                    cx="40%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {distribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, paddingLeft: 16 }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-[40%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Total
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {totalBestsellers.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Top Competitors */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Top Competitors
            </p>
            <div className="flex flex-col gap-4">
              {overview.slice(0, 4).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[12px] mb-1.5">
                    <span className="text-slate-600 font-medium">
                      {c.competitor_name}
                    </span>
                    <span className="text-slate-400">
                      {c.bestsellers_count} items
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(c.bestsellers_count / totalBestsellers) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Recent Products Table ── */}
        <motion.div
          variants={itemVariants}
          className="bg-white border border-slate-100 rounded-xl overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent Inventory Update
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left table-fixed">
              <colgroup>
                <col style={{ width: "64px" }} />
                <col style={{ width: "auto" }} />
                <col style={{ width: "130px" }} />
                <col style={{ width: "110px" }} />
                <col style={{ width: "100px" }} />
                <col style={{ width: "90px" }} />
                <col style={{ width: "48px" }} />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100">
                  {[
                    "Image",
                    "Product",
                    "Competitor",
                    "Price",
                    "Stock",
                    "Updated",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {productsData?.products?.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors group"
                  >
                    {/* Image */}
                    <td className="px-4 py-3">
                      <div className="h-10 w-9 rounded-lg overflow-hidden border border-slate-100 shrink-0">
                        <img
                          src={p.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-4 py-3 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-tight truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                        {p.sku}
                      </p>
                    </td>

                    {/* Competitor */}
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-[10px] font-semibold whitespace-nowrap">
                        {getCompetitorName(p.competitor_id)}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        ₹{p.current_price?.toLocaleString()}
                      </p>
                      {p.discount_pct > 0 && (
                        <p className="text-[10px] text-rose-500 whitespace-nowrap">
                          -{Math.round(p.discount_pct)}% off
                        </p>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap",
                          p.stock_available
                            ? "text-emerald-600 bg-emerald-50"
                            : "text-rose-500 bg-rose-50",
                        )}
                      >
                        <div
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.stock_available ? "bg-emerald-500" : "bg-rose-500"}`}
                        />
                        {p.stock_available ? (
                          p.is_quantity_disclose === false ? "N/A" : `${p.total_quantity ?? 0} units`
                        ) : "Out"}
                      </span>
                    </td>

                    {/* Updated */}
                    <td className="px-4 py-3 text-[11px] text-slate-400 whitespace-nowrap">
                      {format(parseISO(p.last_updated_at), "MMM dd")}
                    </td>

                    {/* Eye — opens modal only */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        title="View product details"
                        onClick={(e) => handleEyeClick(e, p)}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default Overview;
