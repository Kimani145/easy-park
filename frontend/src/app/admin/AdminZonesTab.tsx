import { CircleParking, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { MOCK_ZONES } from "./mockData";

function OccupancyBar({ ratio }: { ratio: number }) {
  const color = ratio > 0.8 ? "#ef4444" : ratio > 0.6 ? "#f59e0b" : "#10b981";
  return (
    <div className="h-2 rounded-full bg-white/8 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${ratio * 100}%`, background: color }}
      />
    </div>
  );
}

export function AdminZonesTab() {
  return (
    <div className="space-y-4">
      {MOCK_ZONES.map(zone => {
        const occupied = zone.occupied;
        const free = zone.total - zone.occupied;
        const ratio = occupied / zone.total;
        const pct = Math.round(ratio * 100);
        const statusColor = ratio > 0.8 ? "#ef4444" : ratio > 0.6 ? "#f59e0b" : "#10b981";

        return (
          <div key={zone.id} className="rounded-2xl border border-white/8 p-5" style={{ background: "#0f172a" }}>
            {/* Zone header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${statusColor}18`, border: `1.5px solid ${statusColor}40` }}>
                  <CircleParking size={18} style={{ color: statusColor }} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{zone.label.split(" — ")[0]}</h3>
                  <p className="text-[11px] font-mono text-white/40">{zone.label.split(" — ")[1]}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black" style={{ color: statusColor }}>{pct}%</p>
                <p className="text-[10px] font-mono text-white/30">occupied</p>
              </div>
            </div>

            {/* Occupancy bar */}
            <OccupancyBar ratio={ratio} />

            {/* Stats row */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              {[
                { label: "Total",      value: zone.total,      color: "text-white",    icon: <TrendingUp size={11} className="text-white/30" /> },
                { label: "Occupied",   value: occupied,         color: "text-[#ef4444]",icon: <CircleParking size={11} className="text-[#ef4444]/60" /> },
                { label: "Free",       value: free,             color: "text-[#10b981]",icon: <CheckCircle2 size={11} className="text-[#10b981]/60" /> },
                { label: "Unverified", value: zone.unverified,  color: zone.unverified > 0 ? "text-[#f59e0b]" : "text-white/30", icon: <AlertTriangle size={11} className={zone.unverified > 0 ? "text-[#f59e0b]/60" : "text-white/20"} /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="rounded-xl p-3 border border-white/5" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="flex items-center gap-1 mb-1">{icon}<span className="text-[9px] font-mono text-white/30 tracking-widest uppercase">{label}</span></div>
                  <p className={`text-lg font-black ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Unverified alert */}
            {zone.unverified > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <AlertTriangle size={12} className="text-[#f59e0b] flex-shrink-0" />
                <p className="text-[11px] font-mono text-[#f59e0b]">
                  {zone.unverified} slot{zone.unverified !== 1 ? "s" : ""} flagged unverified — marshal review required
                </p>
              </div>
            )}
          </div>
        );
      })}

      {/* Aggregate totals */}
      <div className="rounded-2xl border border-white/8 p-5 grid grid-cols-3 gap-4" style={{ background: "#0f172a" }}>
        {(() => {
          const totals = MOCK_ZONES.reduce((acc, z) => ({
            total: acc.total + z.total,
            occupied: acc.occupied + z.occupied,
            unverified: acc.unverified + z.unverified,
          }), { total: 0, occupied: 0, unverified: 0 });

          return [
            { label: "Network Total", value: totals.total, color: "text-white" },
            { label: "Network Occupied", value: totals.occupied, color: "text-[#ef4444]" },
            { label: "Unverified Total", value: totals.unverified, color: totals.unverified > 0 ? "text-[#f59e0b]" : "text-white/30" },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center">
              <p className={`text-3xl font-black ${color}`}>{value}</p>
              <p className="text-[9px] font-mono text-white/30 tracking-widest uppercase mt-0.5">{label}</p>
            </div>
          ));
        })()}
      </div>
    </div>
  );
}
