import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { CircleParking, Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, Check, Car, Shield } from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { apiFetch } from "./services/api";

type Role = "driver" | "marshal";

const ROLE_OPTIONS: { id: Role; label: string; desc: string; Icon: React.ElementType }[] = [
  { id: "driver",  label: "Driver",  desc: "Find & reserve parking", Icon: Car },
  { id: "marshal", label: "Marshal", desc: "Manage parking zones",   Icon: Shield },
];

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number",            test: (p: string) => /[0-9]/.test(p) },
];

export default function Signup() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>("driver");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const strength = PASSWORD_RULES.filter(r => r.test(form.password)).length;
  const strengthColor =
    strength === 0 ? "bg-border" :
    strength === 1 ? "bg-destructive" :
    strength === 2 ? "bg-[#f59e0b]" :
    "bg-primary";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.confirm) { setError("Please fill in all fields."); return; }
    if (!/\S+@\S+\.\S+/.test(form.email)) { setError("Enter a valid email address."); return; }
    if (strength < 3) { setError("Password doesn't meet all requirements."); return; }
    if (form.password !== form.confirm) { setError("Passwords don't match."); return; }
    
    setLoading(true);
    try {
      await apiFetch("/api/v1/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: role.toUpperCase(), // backend expects DRIVER, MARSHAL, ADMIN
        }),
      });
      // Navigate back to login after successful registration
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const confirmMismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const confirmMatch    = form.confirm.length > 0 && form.confirm === form.password;

  return (
    <div className="min-h-screen bg-background flex" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Decorative left panel — always dark by design */}
      <div className="hidden lg:flex flex-col w-[480px] flex-shrink-0 relative overflow-hidden" style={{ background: "#0c110e" }}>
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 480 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="sgrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(57,224,121,0.06)" strokeWidth="0.6" />
            </pattern>
            <radialGradient id="sglow" cx="40%" cy="40%" r="55%">
              <stop offset="0%" stopColor="#39e079" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#39e079" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="480" height="800" fill="url(#sgrid)" />
          <rect width="480" height="800" fill="url(#sglow)" />
          {[100,260,420,580,740].map(y => <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="10" />)}
          {[100,240,380].map(x => <line key={x} x1={x} y1="0" x2={x} y2="800" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />)}
          {[[15,15,75,75],[100,15,130,75],[240,15,100,75],[350,15,115,75],[15,110,75,140],[100,110,130,60],[240,110,100,140],[350,110,115,80],[15,280,120,120],[145,280,85,100],[240,280,100,120],[350,280,115,100],[15,440,100,120],[125,450,105,100],[240,440,100,130],[350,440,115,110],[15,610,120,110],[145,620,85,90],[240,610,100,120],[350,600,115,130]].map(([x,y,w,h],i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx={4} fill="rgba(255,255,255,0.035)" stroke="rgba(57,224,121,0.07)" strokeWidth="0.5" />
          ))}
          {[[55,175,0.85],[170,350,0.4],[310,175,0.12],[55,530,0.6],[310,510,0.9],[170,700,0.25]].map(([x,y,ratio],i) => {
            const c = (ratio as number) > 0.4 ? "#39e079" : (ratio as number) > 0.15 ? "#e0a839" : "#e05555";
            return (<g key={i} transform={`translate(${x},${y})`}><circle r={12} fill={`${c}18`} stroke={c} strokeWidth="1" /><circle r={6} fill={c} opacity="0.85" /><text textAnchor="middle" dominantBaseline="central" fontSize="6" fill="#0a0f0c" fontWeight="800" fontFamily="monospace">P</text></g>);
          })}
          <g transform="translate(240,520)"><circle r={20} fill="rgba(57,224,121,0.1)" /><circle r={10} fill="#39e079" /><circle r={4.5} fill="#0a0f0c" /></g>
        </svg>

        <div className="relative z-10 flex flex-col justify-end h-full p-10 pb-14">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#39e079" }}>
              <CircleParking size={18} style={{ color: "#0a0f0c" }} strokeWidth={2.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              easy<span style={{ color: "#39e079" }}>park</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-snug mb-3">Your spot.<br />Reserved.</h2>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Create a free account to reserve parking spots, save favorites, and get live directions in seconds.
          </p>
          <div className="mt-8 space-y-3">
            {["Real-time spot availability near you","Reserve ahead — no surprises on arrival","Turn-by-turn directions to any garage"].map(feat => (
              <div key={feat} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(57,224,121,0.15)", border: "1px solid rgba(57,224,121,0.3)" }}>
                  <Check size={10} style={{ color: "#39e079" }} />
                </div>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{feat}</p>
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

        <div className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm">
            <div className="hidden lg:flex justify-end mb-6">
              <ThemeSwitcher />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
            <p className="text-sm text-muted-foreground mb-5">Start finding parking in seconds</p>

            {/* Role selector */}
            <div className="mb-5">
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
              {/* Full name */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Full Name</label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Alex Rivera"
                    value={form.name}
                    onChange={set("name")}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Email</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={set("email")}
                    className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    className="w-full h-12 pl-10 pr-10 rounded-xl border border-border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/50 transition-all"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>

                {/* Strength meter */}
                {form.password.length > 0 && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength ? strengthColor : "bg-border"}`} />
                      ))}
                    </div>
                    <div className="space-y-1">
                      {PASSWORD_RULES.map(rule => (
                        <div key={rule.label} className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${rule.test(form.password) ? "bg-primary/20" : "bg-border"}`}>
                            {rule.test(form.password) && <Check size={8} className="text-primary" />}
                          </div>
                          <span className={`text-[10px] font-mono transition-colors ${rule.test(form.password) ? "text-primary" : "text-muted-foreground"}`}>
                            {rule.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-[11px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.confirm}
                    onChange={set("confirm")}
                    className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-card text-foreground text-base placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all ${
                      confirmMismatch ? "border-destructive/50 focus:ring-destructive/40" :
                      confirmMatch    ? "border-primary/40 focus:ring-primary/60" :
                                        "border-border focus:ring-primary/60 focus:border-primary/50"
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {confirmMismatch && (
                  <p className="text-[10px] font-mono text-destructive mt-1.5">Passwords don&apos;t match</p>
                )}
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
                    Creating account…
                  </span>
                ) : (
                  <>
                    Create {ROLE_OPTIONS.find(r => r.id === role)?.label} account
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <p className="text-[10px] font-mono text-muted-foreground text-center leading-relaxed">
                By signing up you agree to our{" "}
                <button type="button" className="text-primary hover:opacity-80 transition-opacity">Terms</button>
                {" "}and{" "}
                <button type="button" className="text-primary hover:opacity-80 transition-opacity">Privacy Policy</button>.
              </p>
            </form>

            <div className="mt-6 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/" className="text-primary font-semibold hover:opacity-80 transition-opacity">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
