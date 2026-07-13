import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, User, Lock, Eye, EyeOff, Check, CircleParking, Clock, ChevronRight, LogOut } from "lucide-react";
import { ThemeSwitcher } from "./components/ThemeSwitcher";
import { ParkingHistoryModal, type HistoryEntry } from "./components/ParkingHistoryModal";
import { toast } from "sonner";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const MOCK_HISTORY: HistoryEntry[] = [
  { id: "EP4KX9R", parkingName: "Central Plaza Garage", address: "12 Central Ave, Downtown", date: "2026-06-17", startTime: "09:00", duration: 2, totalCost: 5.0, status: "completed" },
  { id: "EP7NM2T", parkingName: "Metro Station Deck", address: "5 Metro Plaza, Midtown", date: "2026-06-15", startTime: "14:30", duration: 3, totalCost: 9.0, status: "completed" },
  { id: "EPAB1ZQ", parkingName: "Riverside Open Lot", address: "88 River St, Westside", date: "2026-06-12", startTime: "11:00", duration: 1, totalCost: 1.0, status: "cancelled" },
  { id: "EPC3YLP", parkingName: "Uptown Smart Garage", address: "900 Uptown Circle, Northside", date: "2026-06-10", startTime: "08:00", duration: 4, totalCost: 16.0, status: "completed" },
  { id: "EPD8WVK", parkingName: "Harbor View Parking", address: "301 Harbor Blvd, Eastside", date: "2026-06-08", startTime: "16:00", duration: 2, totalCost: 3.5, status: "completed" },
  { id: "EPE2RXJ", parkingName: "Central Plaza Garage", address: "12 Central Ave, Downtown", date: "2026-06-05", startTime: "10:00", duration: 2, totalCost: 5.0, status: "completed" },
  { id: "EPF9TUH", parkingName: "Metro Station Deck", address: "5 Metro Plaza, Midtown", date: "2026-06-01", startTime: "13:00", duration: 6, totalCost: 18.0, status: "completed" },
];

export default function Profile() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ current: "", newPass: "", confirm: "" });
  const [show, setShow] = useState({ current: false, newPass: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.value }));
  const toggleShow = (f: keyof typeof show) => setShow(prev => ({ ...prev, [f]: !prev[f] }));

  const strength = PASSWORD_RULES.filter(r => r.test(form.newPass)).length;
  const strengthColor = strength === 0 ? "bg-border" : strength === 1 ? "bg-[#e05555]" : strength === 2 ? "bg-[#e0a839]" : "bg-[#39e079]";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current || !form.newPass || !form.confirm) { toast.error("Please fill in all fields."); return; }
    if (strength < 3) { toast.error("Password doesn't meet all requirements."); return; }
    if (form.newPass !== form.confirm) { toast.error("Passwords don't match."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    setForm({ current: "", newPass: "", confirm: "" });
    toast.success("Password updated successfully.");
  };

  const PREVIEW = MOCK_HISTORY.slice(0, 5);
  const totalSpent = MOCK_HISTORY.filter(h => h.status === "completed").reduce((s, h) => s + h.totalCost, 0);

  return (
    <div className="min-h-screen bg-background text-foreground" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-20 h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 gap-3">
        <button onClick={() => navigate("/app")} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary transition-colors">
          <ArrowLeft size={14} className="text-muted-foreground" />
        </button>
        <span className="text-base font-semibold text-foreground flex-1">My Profile</span>
        <ThemeSwitcher />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Profile card */}
        <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary">AR</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground">Alex Rivera</h2>
            <p className="text-sm text-muted-foreground truncate">alex.rivera@example.com</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">Member since June 2026 · DRIVER</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Sessions", value: MOCK_HISTORY.filter(h => h.status === "completed").length.toString() },
            { label: "Total spent", value: `$${totalSpent.toFixed(0)}` },
            { label: "Cancelled", value: MOCK_HISTORY.filter(h => h.status === "cancelled").length.toString() },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-xl font-bold font-mono text-foreground">{value}</p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Change password */}
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Lock size={15} className="text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Change Password</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Current password */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Current Password</label>
              <div className="relative">
                <input type={show.current ? "text" : "password"} value={form.current} onChange={set("current")} placeholder="••••••••"
                  className="w-full h-11 px-3 pr-10 rounded-xl border border-border bg-secondary/40 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all" autoComplete="current-password"/>
                <button type="button" onClick={() => toggleShow("current")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {show.current ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">New Password</label>
              <div className="relative">
                <input type={show.newPass ? "text" : "password"} value={form.newPass} onChange={set("newPass")} placeholder="••••••••"
                  className="w-full h-11 px-3 pr-10 rounded-xl border border-border bg-secondary/40 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/40 transition-all" autoComplete="new-password"/>
                <button type="button" onClick={() => toggleShow("newPass")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {show.newPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.newPass.length > 0 && (
                <div className="mt-2.5 space-y-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < strength ? strengthColor : "bg-border"}`}/>)}
                  </div>
                  <div className="space-y-1">
                    {PASSWORD_RULES.map(rule => (
                      <div key={rule.label} className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-colors ${rule.test(form.newPass) ? "bg-[#39e079]/20" : "bg-border"}`}>
                          {rule.test(form.newPass) && <Check size={8} className="text-[#39e079]" />}
                        </div>
                        <span className={`text-[10px] font-mono transition-colors ${rule.test(form.newPass) ? "text-[#39e079]" : "text-muted-foreground"}`}>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm */}
            <div>
              <label className="block text-[10px] font-mono text-muted-foreground tracking-widest uppercase mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input type={show.confirm ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="••••••••"
                  className={`w-full h-11 px-3 pr-10 rounded-xl border bg-secondary/40 text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 transition-all ${form.confirm && form.confirm !== form.newPass ? "border-[#e05555]/50 focus:ring-[#e05555]/40" : form.confirm && form.confirm === form.newPass ? "border-[#39e079]/40 focus:ring-[#39e079]/60" : "border-border focus:ring-primary/50 focus:border-primary/40"}`} autoComplete="new-password"/>
                <button type="button" onClick={() => toggleShow("confirm")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                  {show.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.confirm && form.confirm !== form.newPass && (
                <p className="text-[10px] font-mono text-[#e05555] mt-1.5">Passwords don&apos;t match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? <><span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"/>Updating…</> : "Update Password"}
            </button>
          </form>
        </div>

        {/* Parking history */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Recent Parking</h3>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{MOCK_HISTORY.length} total</span>
          </div>

          <div className="space-y-2.5">
            {PREVIEW.map(h => (
              <div key={h.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${h.status === "completed" ? "bg-[#39e079]/15" : "bg-[#e05555]/15"}`}>
                  <CircleParking size={14} className={h.status === "completed" ? "text-[#39e079]" : "text-[#e05555]"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{h.parkingName}</p>
                  <p className="text-[11px] font-mono text-muted-foreground">{h.date} · {h.duration}h</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold font-mono text-foreground">${h.totalCost.toFixed(2)}</p>
                  <p className={`text-[9px] font-mono uppercase tracking-wide ${h.status === "completed" ? "text-[#39e079]" : "text-[#e05555]"}`}>{h.status}</p>
                </div>
              </div>
            ))}
          </div>

          {MOCK_HISTORY.length > 5 && (
            <button onClick={() => setShowHistory(true)} className="w-full mt-4 h-9 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2">
              View all {MOCK_HISTORY.length} sessions <ChevronRight size={14} />
            </button>
          )}
        </div>

        {/* Log out */}
        <button onClick={() => navigate("/")} className="w-full h-11 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex items-center justify-center gap-2 mb-8">
          <LogOut size={14} /> Log out
        </button>
      </div>

      {showHistory && <ParkingHistoryModal entries={MOCK_HISTORY} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
