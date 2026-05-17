import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, Variants } from "framer-motion";
import { useQuery, useQueries } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
import {
  Competitor,
  CompetitorOverviewCard,
  Product,
  NewArrivalTrendPoint,
} from "../types";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

const COMPETITOR_COLORS: Record<string, string> = {
  Aurelia: "#F9AD3D", // Yellow
  W: "#c0392b", // Red
  "Global Desi": "#000000", // Black
};

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
              style={{ backgroundColor: "#F9AD3D" }}
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

  // ── Live Clock ──
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const [trendType, setTrendType] = useState<"new" | "best">("new");
  const [detectionType, setDetectionType] = useState<"new" | "best">("new");

  const { data: overview = [] } = useQuery<CompetitorOverviewCard[]>({
    queryKey: ["overview"],
    queryFn: competitorService.getOverview,
    refetchInterval: 2000,
  });

  // ── New Arrivals Trend ──
  const { data: newArrivalsTrend = [] } = useQuery<NewArrivalTrendPoint[]>({
    queryKey: ["newArrivalsTrend", detectionType],
    queryFn: () =>
      analyticsService.getNewArrivalsTrend({
        days: 14,
        is_new_launch: detectionType === "new",
      }),
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
      queryKey: ["trend", c.id, 7, trendType],
      queryFn: () =>
        analyticsService.getPriceTrend({
          competitor_id: c.id,
          days: 7,
          is_new_launch: trendType === "new",
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

  const groupedNewArrivalsData = useMemo(() => {
    const dataMap: Record<string, any> = {};
    const competitorNames = new Set<string>();

    newArrivalsTrend.forEach((p) => {
      const d = p.date;
      if (!dataMap[d]) dataMap[d] = { date: d };
      dataMap[d][p.competitor_name] = p.count;
      competitorNames.add(p.competitor_name);
    });

    const fixedOrder = ["W", "Aurelia", "Global Desi"];
    const names = fixedOrder.filter((name) => competitorNames.has(name));
    competitorNames.forEach((name) => {
      if (!fixedOrder.includes(name)) names.push(name);
    });

    return {
      data: Object.values(dataMap).sort((a: any, b: any) =>
        a.date.localeCompare(b.date),
      ),
      names,
    };
  }, [newArrivalsTrend]);

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
      {/* Playfair Display for Aurelia wordmark */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&display=swap"
      />
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
            <h1 className="text-xl font-bold tracking-tight">
              <span
                style={{
                  color: "#c0392b",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                }}
              >
                BIBA
              </span>
              <span
                style={{
                  color: "#0f172a",
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  marginLeft: "10px",
                }}
              >
                Dashboard
              </span>
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-widest">
              Automated Market Analytics
            </p>
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
            value={`${totals.avgPrice.toLocaleString()}`}
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

        {/* ── New Arrivals Count Trend ── */}
        <motion.div variants={itemVariants}>
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex justify-between items-center mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                {detectionType === "new"
                  ? "New Arrivals Detection"
                  : "Best Sellers Detection"}
              </p>
              <div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                <button
                  onClick={() => setDetectionType("new")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    detectionType === "new"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  NEW
                </button>
                <button
                  onClick={() => setDetectionType("best")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    detectionType === "best"
                      ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  BEST
                </button>
              </div>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupedNewArrivalsData.data}
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  barCategoryGap="5%"
                  barGap={1}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(val) => format(parseISO(val), "MMM dd")}
                    interval={0}
                    padding={{ left: 30, right: 30 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                    labelFormatter={(val) =>
                      format(parseISO(val), "MMMM dd, yyyy")
                    }
                    cursor={false}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      paddingBottom: "10px",
                    }}
                  />
                  {groupedNewArrivalsData.names.map((name, idx) => {
                    const barColor = COMPETITOR_COLORS[name] || "#94a3b8";
                    return (
                      <Bar
                        key={name}
                        dataKey={name}
                        name={name}
                        radius={[4, 4, 0, 0]}
                        barSize={32}
                        fill={barColor}
                        fillOpacity={0.85}
                        isAnimationActive={true}
                        animationBegin={idx * 150}
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    );
                  })}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* ── Charts Row ── */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {/* Price Trends */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex justify-between items-center mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Price Trends
              </p>
              <div className="flex gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-100">
                <button
                  onClick={() => setTrendType("new")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    trendType === "new"
                      ? "bg-white text-blue-600 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  NEW
                </button>
                <button
                  onClick={() => setTrendType("best")}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all ${
                    trendType === "best"
                      ? "bg-white text-emerald-600 shadow-sm border border-slate-100"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  BEST
                </button>
              </div>
            </div>
            <div className="h-56">
              {combinedTrends.length > 0 && (
                <motion.div
                  className="w-full h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={combinedTrends}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
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
                      {competitors.map((c, i) => {
                        const color =
                          COMPETITOR_COLORS[c.name] ||
                          COLORS[i % COLORS.length];
                        return (
                          <Line
                            key={c.id}
                            type="monotone"
                            dataKey={c.name}
                            stroke={color}
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                            isAnimationActive={true}
                            animationBegin={i * 200}
                            animationDuration={1000}
                            animationEasing="ease-out"
                          />
                        );
                      })}
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Bestseller Share ── */}
          <div className="bg-white border border-slate-100 rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Bestseller Share
            </p>

            {/*
              The Pie cx="40%" shifts the donut left to make room for the
              legend on the right. The centre-label overlay must match that
              offset, so we use a flex container that fills the chart area and
              apply a right-side padding equal to the legend width (~30% of the
              container) to push the text back into the donut hole.
            */}
            <div className="h-56 relative">
              {distribution.length > 0 && (
                <motion.div
                  className="w-full h-full"
                  initial={{ scale: 0, opacity: 0, rotate: -360 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                >
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
                        isAnimationActive={true}
                        animationBegin={0}
                        animationDuration={900}
                        animationEasing="ease-out"
                      >
                        {distribution.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              COMPETITOR_COLORS[entry.name] ||
                              COLORS[i % COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        position={{ x: 0, y: 0 }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        wrapperStyle={{ fontSize: 10, paddingLeft: 16 }}
                        formatter={(value) => {
                          const item = distribution.find(
                            (d) => d.name === value,
                          );
                          return `${value} (${item ? item.value : 0})`;
                        }}
                      />
                    </RePieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Centre label — aligned with cx="40%" by padding the right ~30% */}
              <div
                className="absolute inset-y-0 flex flex-col items-center justify-center text-center pointer-events-none"
                style={{ left: "40%", transform: "translateX(-120%)" }}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-none mb-1">
                  Total
                </p>
                <p className="text-xl font-bold text-slate-900 leading-none">
                  {totalBestsellers.toLocaleString()}
                </p>
              </div>
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
                <col style={{ width: "90px" }} />
                <col style={{ width: "48px" }} />
              </colgroup>
              <thead>
                <tr
                  className="border-b"
                  style={{
                    backgroundColor: "rgba(192, 57, 43, 0.06)",
                    borderBottomColor: "rgba(192, 57, 43, 0.12)",
                  }}
                >
                  {[
                    "Image",
                    "Product",
                    "Competitor",
                    "Price",
                    "Updated",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: "#c0392b" }}
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
                    className="hover:bg-slate-50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedProduct(p)}
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
                        {p.current_price?.toLocaleString()}
                      </p>
                      {p.discount_pct > 0 && (
                        <p className="text-[10px] text-rose-500 whitespace-nowrap">
                          -{Math.round(p.discount_pct)}% off
                        </p>
                      )}
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
