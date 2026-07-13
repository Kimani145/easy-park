import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { CircleParking, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Car, Shield } from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { apiFetch } from "./services/api";
import { useAuth } from "./contexts/AuthContext";

type Role = "driver" | "marshal";

const ROLE_OPTIONS: { id: Role; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: "driver",  label: "Driver",  desc: "Find & reserve parking", Icon: Car },
  { id: "marshal", label: "Marshal", desc: "Manage parking zones",   Icon: Shield },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Note: UI role selection is purely visual; actual role is determined by the backend token
  const [role, setRole] = useState<Role>("driver");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError("Enter a valid email address."); return; }
    
    setLoading(true);
    try {
      const data = await apiFetch<{ access: string, refresh: string }>("/api/v1/auth/login/", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      login(data.access, data.refresh);
      // Navigation is handled by ProtectedRoute/AuthContext once role is decoded,
      // but we can manually trigger a navigation here to the default dashboard for the UI selected role,
      // though AuthContext decode + manual push is cleaner.
      navigate(role === "marshal" ? "/marshal" : "/app");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Decorative left panel — desktop only, always dark by design */}
      <div className="hidden lg:flex flex-col w-[480px] flex-shrink-0 relative overflow-hidden" style={{ background: "#0c110e" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="lgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(57,224,121,0.06)" strokeWidth="0.6" />
            </pattern>
            <radialGradient id="glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#39e079" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#39e079" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="480" height="800" fill="url(#lgrid)" />
          <rect width="480" height="800" fill="url(#glow)" />
          {[120,280,440,600,760].map(y => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="10" />)}
          {[80,220,360].map(x => <line key={x} x1={x} y1="0" x2={x} y2="800" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />)}
          {[[20,20,140,90],[170,20,130,90],[310,20,150,90],[20,130,90,130],[120,130,90,130],[220,130,120,130],[20,300,150,120],[180,300,80,120],[270,300,190,120],[20,450,110,130],[140,460,100,110],[250,450,210,130],[20,620,160,120],[190,630,100,100],[300,620,160,130]].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={4} fill="rgba(255,255,255,0.04)" stroke="rgba(57,224,121,0.08)" strokeWidth="0.5" />
          ))}
          {[[80,200,0.7],[250,390,0.3],[360,200,0.9],[140,560,0.15],[320,700,0.6]].map(([x,y,ratio],i) => {
            const c = (ratio as number) > 0.4 ? "#39e079" : (ratio as number) > 0.15 ? "#e0a839" : "#e05555";
            return (<g key={i} transform={`translate(${x},${y})`}><circle r={14} fill={`${c}18`} stroke={c} strokeWidth="1" /><circle r={7} fill={c} opacity="0.9" /><text textAnchor="middle" dominantBaseline="central" fontSize="7" fill="#0a0f0c" fontWeight="800" fontFamily="monospace">P</text></g>);
          })}
          <g transform="translate(220,390)"><circle r={18} fill="rgba(57,224,121,0.12)" /><circle r={9} fill="#39e079" /><circle r={4} fill="#0a0f0c" /></g>
        </svg>

        <div className="relative z-10 flex flex-col justify-end h-full p-10 pb-14">
          <div className="flex items-center gap-3 mb-8">
            {/* Logo uses bg-primary token via inline — panel is always dark, so #39e079 in SVG is correct */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#39e079" }}>
              <CircleParking size={18} style={{ color: "#0a0f0c" }} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              easy<span style={{ color: "#39e079" }}>park</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">Find parking.<br />Skip the search.</h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Real-time availability, pricing, and turn-by-turn directions to available spots near you.
          </p>
          <div className="mt-8 flex gap-3">
            {[{val:"2 min",label:"avg. time saved"},{val:"500+",label:"garages covered"},{val:"Live",label:"availability data"}].map(({val,label}) => (
              <div key={label} className="flex-1 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-base font-bold font-mono" style={{ color: "#39e079" }}>{val}</p>
                <p className="text-[10px] font-mono mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form side */}
      <div className="flex-1 flex flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-5 pt-5 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CircleParking size={16} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              easy<span className="text-primary">park</span>
            </span>
          </div>
          <ThemeSwitcher />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-sm">
            {/* Desktop theme switcher */}
            <div className="hidden lg:flex justify-end mb-6">
              <ThemeSwitcher />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
            <p className="text-sm text-muted-foreground mb-6">Log in to your EasyPark account</p>

            {/* Role selector */}
            <div className="mb-6">
              <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-2">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map(({ id, label, desc, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRole(id)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                      role === id
                        ? "border-primary bg-primary/8"
                        : "border-border bg-card hover:border-border/80"
                    }`}
                  >
                    <Icon size={18} className={role === id ? "text-primary" : "text-muted-foreground"} />
                    <span className={`text-sm font-bold ${role === id ? "text-primary" : "text-foreground"}`}>{label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground text-center leading-tight">{desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Email */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase">Password</label>
                  <button type="button" className="text-[11px] font-mono text-primary hover:opacity-80 transition-opacity">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-2.5">
                  <AlertCircle size={13} className="text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive font-mono">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Logging in…
                  </span>
                ) : (
                  <>
                    Log in as {ROLE_OPTIONS.find(r => r.id === role)?.label}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="text-primary font-semibold hover:opacity-80 transition-opacity">
                  Sign up free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
