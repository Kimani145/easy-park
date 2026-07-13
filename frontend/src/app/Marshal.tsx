import { useState, useEffect } from "react";
import { Drawer } from "vaul";
import {
  WifiOff, RefreshCw, ChevronDown, User, CheckCircle2,
  XCircle, AlertTriangle, CircleParking, Clock, Zap,
  MapPin, Filter, RotateCcw,
} from "lucide-react";
import { apiFetch } from "./services/api";

/* ── Types ── */
type SlotStatus = "free" | "occupied" | "unverified";

type Slot = {
  id: string;
  label: string;
  status: SlotStatus;
  occupiedSince?: number; // timestamp ms
  driver?: string;
};

type Zone = { id: string; label: string };

/* ── Data ── */
const ZONES: Zone[] = [
  { id: "a", label: "Zone A — Central Plaza" },
  { id: "b", label: "Zone B — Riverside Lot" },
  { id: "c", label: "Zone C — Metro Deck" },
];

// Mock slot logic removed

/* ── Helpers ── */
function elapsed(since?: number): string {
  if (!since) return "";
  const s = Math.floor((Date.now() - since) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const STATUS_CONFIG = {
  free: {
    border: "border-[#10b981]",
    bg: "bg-[#10b981]/8",
    badgeBg: "bg-[#10b981]/15 border-[#10b981]/30 text-[#10b981]",
    text: "text-[#10b981]",
    label: "FREE",
    icon: <CheckCircle2 size={10} />,
  },
  occupied: {
    border: "border-[#ef4444]",
    bg: "bg-[#ef4444]/8",
    badgeBg: "bg-[#ef4444]/15 border-[#ef4444]/30 text-[#ef4444]",
    text: "text-[#ef4444]",
    label: "OCCUPIED",
    icon: <XCircle size={10} />,
  },
  unverified: {
    border: "border-[#f59e0b]",
    bg: "bg-[#f59e0b]/8",
    badgeBg: "bg-[#f59e0b]/15 border-[#f59e0b]/30 text-[#f59e0b]",
    text: "text-[#f59e0b]",
    label: "UNVERIFIED",
    icon: <AlertTriangle size={10} />,
  },
};

/* ── Slot card ── */
function SlotCard({ slot, onTap }: { slot: Slot; onTap: () => void }) {
  const cfg = STATUS_CONFIG[slot.status];
  return (
    <button
      onClick={onTap}
      className={`
        relative flex flex-col items-center justify-center aspect-square
        rounded-xl border-2 ${cfg.border} ${cfg.bg}
        active:scale-95 transition-transform duration-100
        p-2 gap-1 w-full
      `}
    >
      {/* Slot ID */}
      <span className="text-base font-black text-white tracking-tight leading-none" style={{ fontFamily: "'Inter', sans-serif" }}>
        {slot.label}
      </span>

      {/* Status badge */}
      <span className={`flex items-center gap-0.5 text-[8px] font-bold font-mono tracking-widest px-1.5 py-0.5 rounded border ${cfg.badgeBg}`}>
        {cfg.icon}
        {cfg.label}
      </span>

      {/* Timer for occupied/unverified */}
      {slot.occupiedSince && (
        <span className="flex items-center gap-0.5 text-[9px] font-mono text-white/50">
          <Clock size={8} />
          {elapsed(slot.occupiedSince)}
        </span>
      )}
    </button>
  );
}

/* ── Update drawer ── */
function SlotDrawer({
  slot,
  open,
  onOpenChange,
  onUpdate,
}: {
  slot: Slot | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onUpdate: (id: string, status: SlotStatus) => void;
}) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    // 1. Send queued actions
    const qStr = localStorage.getItem("marshal_sync_queue");
    const queue = qStr ? JSON.parse(qStr) : [];
    if (queue.length > 0) {
      try {
        await apiFetch("/api/v1/sync/bulk/", {
          method: "POST",
          body: JSON.stringify({
            sync_batch_id: `batch-${Date.now()}`,
            client_device_time: new Date().toISOString(),
            queued_actions: queue,
          })
        });
        localStorage.removeItem("marshal_sync_queue");
      } catch (e) {
        console.error("Failed to sync actions", e);
      }
    }
    // 2. We could trigger a refetch here via a callback, 
    // but the drawer only syncs local state, so we close it and let the parent refresh.
    setSyncing(false);
    onOpenChange(false);
  };

  if (!slot) return null;
  const cfg = STATUS_CONFIG[slot.status];

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        {/* Backdrop */}
        <Drawer.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" />

        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl border-t border-white/10"
          style={{ background: "#0f172a", maxHeight: "85vh" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 border-b border-white/8 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <Drawer.Title className="text-xl font-black text-white tracking-tight">
                  Update Slot {slot.label}
                </Drawer.Title>
                <p className="text-xs font-mono text-white/40 mt-0.5">Tap a status to update immediately</p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${cfg.badgeBg}`}>
                {cfg.icon}
                <span className="text-[10px] font-bold font-mono tracking-widest">{cfg.label}</span>
              </div>
            </div>

            {/* Current info */}
            {(slot.driver || slot.occupiedSince) && (
              <div className="mt-3 rounded-xl bg-white/5 border border-white/8 px-4 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User size={14} className="text-white/60" />
                </div>
                <div className="flex-1 min-w-0">
                  {slot.driver && <p className="text-sm font-semibold text-white truncate">{slot.driver}</p>}
                  <p className="text-[11px] font-mono text-white/40 flex items-center gap-1">
                    {slot.occupiedSince && <><Clock size={9} /> Parked {elapsed(slot.occupiedSince)} ago</>}
                    {!slot.occupiedSince && "Conflict detected — verify manually"}
                  </p>
                </div>
              </div>
            )}
            {slot.status === "unverified" && (
              <div className="mt-2 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/25 px-4 py-2.5 flex items-start gap-2">
                <AlertTriangle size={13} className="text-[#f59e0b] flex-shrink-0 mt-0.5" />
                <p className="text-[11px] font-mono text-[#f59e0b] leading-relaxed">
                  Sensor and driver reports conflict. Physically verify and update status below.
                </p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-5 py-5 space-y-3 flex-shrink-0">
            <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase mb-1">Set status</p>

            {/* Mark FREE */}
            <button
              onClick={() => { onUpdate(slot.id, "free"); onOpenChange(false); }}
              className="w-full h-16 rounded-xl bg-[#10b981] flex items-center justify-center gap-3 active:scale-98 transition-transform"
            >
              <CheckCircle2 size={22} className="text-[#052e16]" strokeWidth={2.5} />
              <span className="text-xl font-black text-[#052e16] tracking-tight">Mark as FREE</span>
            </button>

            {/* Mark OCCUPIED */}
            <button
              onClick={() => { onUpdate(slot.id, "occupied"); onOpenChange(false); }}
              className="w-full h-16 rounded-xl bg-[#ef4444] flex items-center justify-center gap-3 active:scale-98 transition-transform"
            >
              <XCircle size={22} className="text-[#1c0000]" strokeWidth={2.5} />
              <span className="text-xl font-black text-[#1c0000] tracking-tight">Mark as OCCUPIED</span>
            </button>

            {/* Mark UNVERIFIED */}
            <button
              onClick={() => { onUpdate(slot.id, "unverified"); onOpenChange(false); }}
              className="w-full h-12 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/30 flex items-center justify-center gap-2 active:scale-98 transition-transform"
            >
              <AlertTriangle size={16} className="text-[#f59e0b]" />
              <span className="text-sm font-bold text-[#f59e0b] tracking-wide">Flag as UNVERIFIED</span>
            </button>

            {/* Divider */}
            <div className="border-t border-white/8 pt-3">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="w-full h-11 rounded-xl border border-white/12 flex items-center justify-center gap-2 bg-white/4 active:bg-white/8 transition-colors disabled:opacity-60"
              >
                <RefreshCw size={14} className={`text-white/50 ${syncing ? "animate-spin" : ""}`} />
                <span className="text-sm font-medium text-white/50">
                  {syncing ? "Syncing…" : "Force Sync this slot"}
                </span>
              </button>
            </div>
          </div>

          {/* Safe area spacer */}
          <div className="h-4 flex-shrink-0" />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

/* ── Zone selector ── */
function ZoneSelector({ zone, onChange }: { zone: Zone; onChange: (z: Zone) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-xl border border-white/12 bg-white/5 text-sm font-semibold text-white max-w-[180px]"
      >
        <MapPin size={12} className="text-[#10b981] flex-shrink-0" />
        <span className="truncate text-xs">{zone.label}</span>
        <ChevronDown size={12} className="text-white/40 flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1.5 left-0 z-20 rounded-xl border border-white/12 overflow-hidden shadow-2xl min-w-[220px]" style={{ background: "#0f172a" }}>
            {ZONES.map(z => (
              <button
                key={z.id}
                onClick={() => { onChange(z); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-4 py-3 text-sm text-left transition-colors ${
                  zone.id === z.id ? "bg-[#10b981]/15 text-[#10b981]" : "text-white/70 hover:bg-white/5"
                }`}
              >
                <MapPin size={12} className={zone.id === z.id ? "text-[#10b981]" : "text-white/30"} />
                {z.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Filter pills ── */
const FILTERS: { key: SlotStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "occupied", label: "Occupied" },
  { key: "unverified", label: "Unverified" },
];

/* ── Main ── */
export default function Marshal() {
  const [zone, setZone] = useState(ZONES[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState<SlotStatus | "all">("all");
  const [pendingQueue, setPendingQueue] = useState<any[]>(() => {
    const q = localStorage.getItem("marshal_sync_queue");
    return q ? JSON.parse(q) : [];
  });
  const [tick, setTick] = useState(0);

  const fetchSlots = async () => {
    try {
      const data = await apiFetch<any[]>("/api/v1/slots/map-grid/?lat=-1.2676&lng=36.8108");
      const mapped = data.map(s => ({
        id: s.id,
        label: s.slot_code,
        status: s.current_status.toLowerCase() as SlotStatus,
        // Mocking occupied since and driver for UI richness since API doesn't return them for map-grid
        occupiedSince: s.current_status !== "FREE" ? Date.now() - 3600000 : undefined,
        driver: s.current_status === "OCCUPIED" ? "Unknown Driver" : undefined,
      }));
      setSlots(mapped);
    } catch (e) {
      console.error(e);
    }
  };

  // Refresh elapsed timers every 30s
  useEffect(() => {
    const id = setInterval(() => setTick(v => v + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Fetch from server on load
  useEffect(() => {
    fetchSlots();
  }, [zone]);

  const handleUpdate = async (id: string, status: SlotStatus) => {
    // Optimistic UI
    setSlots(prev => prev.map(s =>
      s.id === id ? {
        ...s,
        status,
        occupiedSince: status !== "free" ? (s.occupiedSince ?? Date.now()) : undefined,
        driver: status === "occupied" ? (s.driver ?? "Marshal Override") : undefined,
      } : s
    ));

    try {
      await apiFetch(`/api/v1/slots/${id}/override/`, {
        method: "PATCH",
        body: JSON.stringify({ status: status.toUpperCase() })
      });
      // Online sync succeeded
    } catch (e) {
      // Offline or failed: Persist to sync queue
      const action = {
        idempotency_key: `marshal-uuid-${Date.now()}-${Math.random()}`,
        slot_id: id,
        action: "STATUS_OVERRIDE",
        payload: { status: status.toUpperCase() },
        original_timestamp: new Date().toISOString()
      };

      setPendingQueue(prev => {
        const newQ = [...prev, action];
        localStorage.setItem("marshal_sync_queue", JSON.stringify(newQ));
        return newQ;
      });
    }
  };

  const counts = {
    total: slots.length,
    occupied: slots.filter(s => s.status === "occupied").length,
    unverified: slots.filter(s => s.status === "unverified").length,
    free: slots.filter(s => s.status === "free").length,
  };

  const visible = filter === "all" ? slots : slots.filter(s => s.status === filter);

  const openDrawer = (slot: Slot) => {
    setSelectedSlot(slot);
    setDrawerOpen(true);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#09090b", fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-white/8 backdrop-blur-md" style={{ background: "rgba(9,9,11,0.92)" }}>
        <div className="flex items-center gap-2 px-4 h-14">
          {/* Logo + badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-[#10b981] flex items-center justify-center">
              <CircleParking size={14} className="text-[#052e16]" strokeWidth={2.5} />
            </div>
            <span className="text-base font-black text-white tracking-tight leading-none">
              easy<span className="text-[#10b981]">park</span>
            </span>
            <span className="text-[9px] font-bold font-mono tracking-widest text-[#10b981] bg-[#10b981]/12 border border-[#10b981]/25 px-2 py-0.5 rounded-full">
              MARSHAL
            </span>
          </div>

          {/* Zone selector — center */}
          <div className="flex-1 flex justify-center">
            <ZoneSelector zone={zone} onChange={z => setZone(z)} />
          </div>

          {/* Right: offline pill + avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Offline status */}
            <div className="flex items-center gap-1.5 h-7 px-2 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/30">
              <WifiOff size={10} className="text-[#f59e0b]" />
              <span className="text-[9px] font-bold font-mono text-[#f59e0b] hidden sm:block">
                {pendingQueue.length > 0 ? `Offline · ${pendingQueue.length} pending` : "Online"}
              </span>
              <span className="text-[9px] font-bold font-mono text-[#f59e0b] sm:hidden">
                {pendingQueue.length}
              </span>
            </div>
            {/* Sync button */}
            <button 
              onClick={async () => {
                // Quick inline sync trigger
                const qStr = localStorage.getItem("marshal_sync_queue");
                const queue = qStr ? JSON.parse(qStr) : [];
                if (queue.length > 0) {
                  try {
                    await apiFetch("/api/v1/sync/bulk/", {
                      method: "POST",
                      body: JSON.stringify({ sync_batch_id: `batch-${Date.now()}`, client_device_time: new Date().toISOString(), queued_actions: queue })
                    });
                    localStorage.removeItem("marshal_sync_queue");
                    setPendingQueue([]);
                    fetchSlots();
                  } catch(e) {}
                } else {
                  fetchSlots();
                }
              }}
              className="w-7 h-7 rounded-lg border border-white/12 bg-white/5 flex items-center justify-center hover:bg-white/10"
            >
              <RefreshCw size={13} className="text-white/50" />
            </button>
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-[#10b981]">JM</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Metrics bar ── */}
      <div className="sticky z-20 border-b border-white/8" style={{ top: "56px", background: "#09090b" }}>
        <div className="grid grid-cols-3 divide-x divide-white/8 px-0">
          {[
            { label: "Total Slots", value: counts.total, color: "text-white" },
            { label: "Occupied", value: counts.occupied, color: "text-[#ef4444]" },
            { label: "Free", value: counts.free, color: "text-[#10b981]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center justify-center py-3 px-2">
              <span className={`text-2xl font-black leading-none ${color}`}>{value}</span>
              <span className="text-[9px] font-mono text-white/35 tracking-widest uppercase mt-0.5">{label}</span>
            </div>
          ))}
        </div>

        {/* Unverified warning strip */}
        {counts.unverified > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-[#f59e0b]/8 border-t border-[#f59e0b]/20">
            <AlertTriangle size={12} className="text-[#f59e0b] flex-shrink-0" />
            <span className="text-[10px] font-bold font-mono text-[#f59e0b]">
              {counts.unverified} slot{counts.unverified !== 1 ? "s" : ""} need manual verification
            </span>
          </div>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <Filter size={12} className="text-white/30 flex-shrink-0" />
        {FILTERS.map(f => {
          const count = f.key === "all" ? slots.length : slots.filter(s => s.status === f.key).length;
          const active = filter === f.key;
          const accent = f.key === "free" ? "#10b981" : f.key === "occupied" ? "#ef4444" : f.key === "unverified" ? "#f59e0b" : "#ffffff";
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-full border text-[11px] font-semibold font-mono flex-shrink-0 transition-all"
              style={{
                borderColor: active ? `${accent}50` : "rgba(255,255,255,0.1)",
                background: active ? `${accent}18` : "transparent",
                color: active ? accent : "rgba(255,255,255,0.4)",
              }}
            >
              {f.label}
              <span
                className="text-[9px] font-bold px-1 py-0.5 rounded"
                style={{ background: active ? `${accent}25` : "rgba(255,255,255,0.08)" }}
              >
                {count}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => {
            fetchSlots();
            setFilter("all");
          }}
          className="ml-auto flex items-center gap-1.5 h-7 px-3 rounded-full border border-white/10 text-[11px] font-mono text-white/30 flex-shrink-0 hover:border-white/20 hover:text-white/50 transition-colors"
        >
          <RotateCcw size={10} />
          Refresh
        </button>
      </div>

      {/* ── Parking grid ── */}
      <main className="flex-1 px-3 pb-24 overflow-y-auto">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <CircleParking size={28} className="text-white/20 mb-3" />
            <p className="text-sm font-mono text-white/30">No slots match this filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {visible.map(slot => (
              <SlotCard key={slot.id} slot={slot} onTap={() => openDrawer(slot)} />
            ))}
          </div>
        )}
      </main>

      {/* ── Status legend (fixed bottom) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/8 px-4 py-3 flex items-center justify-center gap-5"
        style={{ background: "rgba(9,9,11,0.96)", backdropFilter: "blur(8px)" }}
      >
        {[
          { color: "#10b981", label: "Free" },
          { color: "#ef4444", label: "Occupied" },
          { color: "#f59e0b", label: "Unverified" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm border-2" style={{ borderColor: color }} />
            <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <Zap size={10} className="text-[#10b981]" />
          <span className="text-[10px] font-mono text-white/30">Tap any slot to update</span>
        </div>
      </div>

      {/* ── Slot update drawer ── */}
      <SlotDrawer
        slot={selectedSlot}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
