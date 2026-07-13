import { useState } from "react";
import { useNavigate } from "react-router";
import { CircleParking, LogOut, Users, BarChart2, MapPin, Shield } from "lucide-react";
import { AdminOverviewTab } from "./admin/AdminOverviewTab";
import { AdminUsersTab } from "./admin/AdminUsersTab";
import { AdminZonesTab } from "./admin/AdminZonesTab";
import { AdminMarshalActivityTab } from "./admin/AdminMarshalActivityTab";
import { MOCK_USERS, MOCK_ZONES, MOCK_RECENT_RESERVATIONS, MOCK_MARSHAL_ACTIVITY } from "./admin/mockData";

/* /admin is not linked from any public navigation.
   Route guard (JWT check) is pending backend auth endpoints. */

type AdminTab = "overview" | "users" | "zones" | "marshal";

const TABS: { id: AdminTab; label: string; Icon: React.ElementType }[] = [
  { id: "overview",  label: "Overview",        Icon: BarChart2 },
  { id: "users",     label: "Users",           Icon: Users },
  { id: "zones",     label: "Zones",           Icon: MapPin },
  { id: "marshal",   label: "Marshal Activity",Icon: Shield },
];

export default function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  /* Derived summary stats for the metrics bar */
  const totalSlots     = MOCK_ZONES.reduce((s, z) => s + z.total, 0);
  const totalOccupied  = MOCK_ZONES.reduce((s, z) => s + z.occupied, 0);
  const activeRes      = MOCK_RECENT_RESERVATIONS.filter(r => r.status === "active").length;
  const unresolved     = MOCK_ZONES.reduce((s, z) => s + z.unverified, 0);
  const totalUsers     = MOCK_USERS.length;
  const todayActions   = MOCK_MARSHAL_ACTIVITY.length;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#09090b", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-30 border-b border-white/8 backdrop-blur-md"
        style={{ background: "rgba(9,9,11,0.92)" }}
      >
        <div className="max-w-7xl mx-auto flex items-center gap-4 px-5 h-14">
          {/* Logo + badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#10b981] flex items-center justify-center">
              <CircleParking size={14} className="text-[#052e16]" strokeWidth={2.5} />
            </div>
            <span className="text-base font-black text-white tracking-tight">
              easy<span className="text-[#10b981]">park</span>
            </span>
            <span className="text-[9px] font-bold font-mono tracking-widest text-[#6366f1] bg-[#6366f1]/12 border border-[#6366f1]/25 px-2 py-0.5 rounded-full">
              ADMIN
            </span>
          </div>

          {/* Tab nav — desktop */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold transition-all"
                style={activeTab === id
                  ? { background: "rgba(255,255,255,0.08)", color: "#ffffff" }
                  : { background: "transparent", color: "rgba(255,255,255,0.35)" }
                }
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </nav>

          {/* Right — user + logout */}
          <div className="flex items-center gap-3 ml-auto">
            <div className="w-7 h-7 rounded-full bg-[#6366f1]/20 border border-[#6366f1]/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#6366f1]">EP</span>
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-white/10 text-[10px] font-mono text-white/40 hover:text-white/70 hover:border-white/20 transition-colors"
            >
              <LogOut size={11} />
              Logout
            </button>
          </div>
        </div>

        {/* Mobile tab strip */}
        <div className="md:hidden flex border-t border-white/8 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2.5 px-3 text-[9px] font-mono font-bold tracking-widest whitespace-nowrap transition-colors"
              style={{ color: activeTab === id ? "#10b981" : "rgba(255,255,255,0.3)" }}
            >
              <Icon size={14} />
              {label.split(" ")[0]}
            </button>
          ))}
        </div>
      </header>

      {/* ── Summary metrics bar ── */}
      <div className="border-b border-white/8" style={{ background: "#09090b" }}>
        <div className="max-w-7xl mx-auto grid grid-cols-3 md:grid-cols-6 divide-x divide-white/8">
          {[
            { label: "Total Users",      value: totalUsers,    color: "text-white" },
            { label: "Active Res.",      value: activeRes,     color: "text-[#6366f1]" },
            { label: "Total Slots",      value: totalSlots,    color: "text-white" },
            { label: "Occupied",         value: totalOccupied, color: "text-[#ef4444]" },
            { label: "Unresolved",       value: unresolved,    color: unresolved > 0 ? "text-[#f59e0b]" : "text-white/30" },
            { label: "Marshal Actions",  value: todayActions,  color: "text-[#10b981]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 px-2">
              <span className={`text-xl font-black leading-none ${color}`}>{value}</span>
              <span className="text-[8px] font-mono text-white/30 tracking-widest uppercase mt-0.5 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
          {activeTab === "overview" && <AdminOverviewTab />}
          {activeTab === "users"    && <AdminUsersTab />}
          {activeTab === "zones"    && <AdminZonesTab />}
          {activeTab === "marshal"  && <AdminMarshalActivityTab />}
        </div>
      </main>
    </div>
  );
}
