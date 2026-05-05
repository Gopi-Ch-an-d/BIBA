import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { authService } from "../services/api";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  React.useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/overview");
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await authService.login(email, password);
      localStorage.setItem("token", response.access_token);
      toast.success("Welcome back, Admin!");
      navigate("/overview");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative"
      style={{ backgroundImage: "url('/images/biba-bg2.png')", backgroundColor: "#f3f4f6" }} // Fallback background
    >
      {/* Overlay to dim the background image slightly */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />

      {/* Top Logo and Welcome */}
      <div className="relative z-10 text-center mb-6">
        <img src="/images/biba.png" alt="B" className="h-10 mx-auto mb-2" />
        <p className="text-base font-medium text-slate-700">
          Welcome to <span className="text-rose-700 font-bold">BIBA</span> 
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[900px] bg-white rounded-[24px] shadow-[0_30px_100px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col md:flex-row min-h-[550px]"
      >
        {/* Left Side: Branded Red Section */}
        <div 
          className="w-full md:w-[45%] bg-[#9e0c15] p-10 flex flex-col items-center justify-center relative text-white text-center overflow-hidden"
          style={{ backgroundImage: "linear-gradient(135deg, #9e0c15 0%, #7d0910 100%)" }}
        >
          {/* Floral Ornaments (SVG placeholders) */}
          <div className="absolute top-0 left-0 w-48 h-48 opacity-20 pointer-events-none">
             <img src="/images/floral-top.png" className="w-full h-full object-contain" alt="" />
          </div>
          <div className="absolute bottom-0 right-0 w-48 h-48 opacity-20 pointer-events-none rotate-180">
             <img src="/images/floral-bottom.png" className="w-full h-full object-contain" alt="" />
          </div>

          <div className="relative z-10">
            <h1 className="text-6xl font-serif tracking-[0.1em] mb-4">BIBA</h1>
            <div className="w-24 h-[1px] bg-white/40 mx-auto mb-4 relative">
               <div className="absolute top-[-4px] left-1/2 -translate-x-1/2 text-[8px] tracking-[0.5em]">❖</div>
            </div>
            <p className="text-sm font-light tracking-[0.2em] uppercase opacity-90">
              Fashion that Inspires
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="flex-1 p-10 md:p-14 flex flex-col justify-center bg-white">
          <div className="mb-10 text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Login to your account</h2>
            <p className="text-xs text-slate-400 font-medium">Please enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <User size={18} strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-rose-600 focus:ring-4 focus:ring-rose-600/5 transition-all outline-none"
                  placeholder="admin@biba.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} strokeWidth={1.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-11 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-rose-600 focus:ring-4 focus:ring-rose-600/5 transition-all outline-none"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* <div className="flex items-center justify-between py-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-rose-700 focus:ring-rose-700/20" />
                <span className="text-[11px] font-bold text-slate-500 group-hover:text-slate-700 transition-colors">Remember me</span>
              </label>
              <button type="button" className="text-[11px] font-bold text-rose-700 hover:text-rose-800 transition-colors">
                Forgot Password?
              </button>
            </div> */}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#9e0c15] hover:bg-[#7d0910] text-white font-bold text-sm py-4 rounded-xl shadow-lg shadow-rose-900/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Login"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
