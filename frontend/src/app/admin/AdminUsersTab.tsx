import { useState } from "react";
import { Search, ShieldAlert, ShieldCheck, Car, Shield } from "lucide-react";
import { MOCK_USERS, AdminUser, UserStatus } from "./mockData";

/* Suspend/Activate toggles update local state only.
   TODO: Replace with real mutation endpoints when auth API is ready. */

const ROLE_CONFIG = {
  driver:  { label: "Driver",  color: "#6366f1", Icon: Car },
  marshal: { label: "Marshal", color: "#f59e0b", Icon: Shield },
};

const STATUS_CONFIG: Record<UserStatus, { label: string; color: string }> = {
  active:    { label: "Active",    color: "#10b981" },
  suspended: { label: "Suspended", color: "#ef4444" },
};

export function AdminUsersTab() {
  const [users, setUsers] = useState<AdminUser[]>(MOCK_USERS);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "marshal">("all");

  const toggleStatus = (id: string) => {
    /* Stub: toggling status in memory only. No API call is made. */
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, status: u.status === "active" ? "suspended" : "active" } : u
    ));
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    all: users.length,
    driver: users.filter(u => u.role === "driver").length,
    marshal: users.filter(u => u.role === "marshal").length,
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-xl border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-[#10b981]/40 focus:border-[#10b981]/30 transition-all font-mono"
            style={{ background: "#0f172a" }}
          />
        </div>

        {/* Role filter */}
        <div className="flex rounded-xl overflow-hidden border border-white/10">
          {(["all", "driver", "marshal"] as const).map(key => (
            <button
              key={key}
              onClick={() => setRoleFilter(key)}
              className="h-9 px-3 text-[10px] font-mono font-bold tracking-widest capitalize transition-colors"
              style={{
                background: roleFilter === key ? "rgba(255,255,255,0.08)" : "transparent",
                color: roleFilter === key ? "#ffffff" : "rgba(255,255,255,0.3)",
              }}
            >
              {key === "all" ? `All (${counts.all})` : key === "driver" ? `Drivers (${counts.driver})` : `Marshals (${counts.marshal})`}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/8 overflow-hidden" style={{ background: "#0f172a" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/8">
                {["User", "Role", "Status", "Sessions", "Joined", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[9px] font-mono text-white/30 tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-mono text-white/25">
                    No users match your search
                  </td>
                </tr>
              ) : filtered.map((u, i) => {
                const roleCfg = ROLE_CONFIG[u.role];
                const statusCfg = STATUS_CONFIG[u.status];
                const RoleIcon = roleCfg.Icon;
                return (
                  <tr key={u.id} className={`border-b border-white/5 last:border-0 ${i % 2 === 0 ? "" : "bg-white/[0.02]"}`}>
                    {/* User */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] font-mono text-white/35">{u.email}</p>
                      </div>
                    </td>

                    {/* Role badge */}
                    <td className="px-4 py-3">
                      <span
                        className="flex items-center gap-1.5 w-fit text-[9px] font-bold font-mono tracking-widest px-2 py-1 rounded-lg border"
                        style={{ color: roleCfg.color, borderColor: `${roleCfg.color}40`, background: `${roleCfg.color}15` }}
                      >
                        <RoleIcon size={9} />
                        {roleCfg.label.toUpperCase()}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3">
                      <span
                        className="text-[9px] font-bold font-mono tracking-widest px-2 py-1 rounded-lg border"
                        style={{ color: statusCfg.color, borderColor: `${statusCfg.color}40`, background: `${statusCfg.color}15` }}
                      >
                        {statusCfg.label.toUpperCase()}
                      </span>
                    </td>

                    {/* Sessions */}
                    <td className="px-4 py-3 text-sm font-mono font-bold text-white/70">
                      {u.role === "marshal" ? "—" : u.sessions}
                    </td>

                    {/* Join date */}
                    <td className="px-4 py-3 text-[11px] font-mono text-white/40">{u.joinDate}</td>

                    {/* Action — stub, no API call */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleStatus(u.id)}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-semibold font-mono transition-colors"
                        style={u.status === "active"
                          ? { borderColor: "rgba(239,68,68,0.3)", color: "#ef4444", background: "rgba(239,68,68,0.08)" }
                          : { borderColor: "rgba(16,185,129,0.3)", color: "#10b981", background: "rgba(16,185,129,0.08)" }
                        }
                      >
                        {u.status === "active"
                          ? <><ShieldAlert size={10} /> Suspend</>
                          : <><ShieldCheck size={10} /> Activate</>
                        }
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[10px] font-mono text-white/20 text-right">
        {filtered.length} of {users.length} users shown
      </p>
    </div>
  );
}
