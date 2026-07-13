/* ── Mock data for Admin dashboard ── */
/* Replace each export with a real API call once mutation endpoints are approved. */

export type UserRole = "driver" | "marshal";
export type UserStatus = "active" | "suspended";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  joinDate: string;
  sessions: number;
};

export type RevenuePoint = {
  month: string;
  revenue: number;
};

export type RecentReservation = {
  id: string;
  driver: string;
  zone: string;
  slot: string;
  date: string;
  duration: number;
  cost: number;
  status: "completed" | "active" | "cancelled";
};

export type ZoneData = {
  id: string;
  label: string;
  total: number;
  occupied: number;
  unverified: number;
};

export type MarshalAction = {
  id: string;
  marshal: string;
  zone: string;
  slot: string;
  action: "marked_free" | "marked_occupied" | "flagged_unverified" | "force_synced";
  timestamp: string;
};

export const MOCK_USERS: AdminUser[] = [
  { id: "u1", name: "Alex Rivera", email: "alex.rivera@example.com", role: "driver", status: "active", joinDate: "2026-01-12", sessions: 14 },
  { id: "u2", name: "Jordan Martinez", email: "j.martinez@example.com", role: "marshal", status: "active", joinDate: "2026-02-03", sessions: 0 },
  { id: "u3", name: "Sofia Chen", email: "sofia.chen@example.com", role: "driver", status: "active", joinDate: "2026-03-19", sessions: 7 },
  { id: "u4", name: "Kevin Williams", email: "k.williams@example.com", role: "driver", status: "suspended", joinDate: "2026-01-28", sessions: 3 },
  { id: "u5", name: "Priya Okafor", email: "priya.okafor@example.com", role: "marshal", status: "active", joinDate: "2026-02-14", sessions: 0 },
  { id: "u6", name: "Luca Dubois", email: "luca.dubois@example.com", role: "driver", status: "active", joinDate: "2026-04-07", sessions: 22 },
  { id: "u7", name: "Maria Santos", email: "m.santos@example.com", role: "driver", status: "active", joinDate: "2026-05-01", sessions: 5 },
  { id: "u8", name: "Ren Nakamura", email: "ren.nakamura@example.com", role: "marshal", status: "suspended", joinDate: "2026-03-25", sessions: 0 },
  { id: "u9", name: "Olivia Brown", email: "o.brown@example.com", role: "driver", status: "active", joinDate: "2026-06-02", sessions: 2 },
  { id: "u10", name: "Carlos Vega", email: "c.vega@example.com", role: "driver", status: "active", joinDate: "2026-06-10", sessions: 1 },
];

export const MOCK_REVENUE: RevenuePoint[] = [
  { month: "Jun '25", revenue: 4200 },
  { month: "Jul '25", revenue: 5100 },
  { month: "Aug '25", revenue: 6800 },
  { month: "Sep '25", revenue: 5900 },
  { month: "Oct '25", revenue: 7200 },
  { month: "Nov '25", revenue: 6400 },
  { month: "Dec '25", revenue: 8100 },
  { month: "Jan '26", revenue: 5300 },
  { month: "Feb '26", revenue: 6100 },
  { month: "Mar '26", revenue: 7800 },
  { month: "Apr '26", revenue: 8900 },
  { month: "May '26", revenue: 9200 },
  { month: "Jun '26", revenue: 7400 },
];

export const MOCK_RECENT_RESERVATIONS: RecentReservation[] = [
  { id: "EP4KX9R", driver: "Alex Rivera", zone: "Zone A", slot: "A-12", date: "2026-06-19", duration: 2, cost: 5.00, status: "active" },
  { id: "EP7NM2T", driver: "Sofia Chen", zone: "Zone C", slot: "C-07", date: "2026-06-19", duration: 3, cost: 9.00, status: "active" },
  { id: "EPAB1ZQ", driver: "Luca Dubois", zone: "Zone B", slot: "B-03", date: "2026-06-18", duration: 1, cost: 1.00, status: "completed" },
  { id: "EPC3YLP", driver: "Maria Santos", zone: "Zone A", slot: "A-28", date: "2026-06-18", duration: 4, cost: 10.00, status: "completed" },
  { id: "EPD8WVK", driver: "Olivia Brown", zone: "Zone C", slot: "C-19", date: "2026-06-18", duration: 2, cost: 6.00, status: "cancelled" },
  { id: "EPE2RXJ", driver: "Carlos Vega", zone: "Zone A", slot: "A-05", date: "2026-06-17", duration: 2, cost: 5.00, status: "completed" },
  { id: "EPF9TUH", driver: "Alex Rivera", zone: "Zone C", slot: "C-14", date: "2026-06-17", duration: 6, cost: 18.00, status: "completed" },
  { id: "EPG1QWE", driver: "Kevin Williams", zone: "Zone B", slot: "B-11", date: "2026-06-16", duration: 1, cost: 1.00, status: "cancelled" },
];

export const MOCK_ZONES: ZoneData[] = [
  { id: "a", label: "Zone A — Central Plaza", total: 120, occupied: 85, unverified: 3 },
  { id: "b", label: "Zone B — Riverside Lot", total: 60, occupied: 42, unverified: 1 },
  { id: "c", label: "Zone C — Metro Deck", total: 200, occupied: 156, unverified: 5 },
];

export const MOCK_MARSHAL_ACTIVITY: MarshalAction[] = [
  { id: "ma1", marshal: "Jordan Martinez", zone: "Zone A", slot: "A-12", action: "marked_occupied", timestamp: "2026-06-19 14:32" },
  { id: "ma2", marshal: "Priya Okafor", zone: "Zone C", slot: "C-07", action: "flagged_unverified", timestamp: "2026-06-19 14:15" },
  { id: "ma3", marshal: "Jordan Martinez", zone: "Zone A", slot: "A-05", action: "marked_free", timestamp: "2026-06-19 13:58" },
  { id: "ma4", marshal: "Priya Okafor", zone: "Zone C", slot: "C-19", action: "force_synced", timestamp: "2026-06-19 13:41" },
  { id: "ma5", marshal: "Jordan Martinez", zone: "Zone B", slot: "B-03", action: "marked_free", timestamp: "2026-06-19 13:20" },
  { id: "ma6", marshal: "Priya Okafor", zone: "Zone C", slot: "C-29", action: "marked_occupied", timestamp: "2026-06-19 12:55" },
  { id: "ma7", marshal: "Jordan Martinez", zone: "Zone A", slot: "A-18", action: "flagged_unverified", timestamp: "2026-06-19 12:30" },
  { id: "ma8", marshal: "Priya Okafor", zone: "Zone C", slot: "C-14", action: "marked_free", timestamp: "2026-06-19 12:08" },
  { id: "ma9", marshal: "Jordan Martinez", zone: "Zone A", slot: "A-22", action: "marked_occupied", timestamp: "2026-06-19 11:45" },
  { id: "ma10", marshal: "Priya Okafor", zone: "Zone B", slot: "B-08", action: "force_synced", timestamp: "2026-06-19 11:22" },
];

export const ACTION_LABELS: Record<MarshalAction["action"], string> = {
  marked_free: "Marked Free",
  marked_occupied: "Marked Occupied",
  flagged_unverified: "Flagged Unverified",
  force_synced: "Force Synced",
};

export const ACTION_COLORS: Record<MarshalAction["action"], string> = {
  marked_free: "#10b981",
  marked_occupied: "#ef4444",
  flagged_unverified: "#f59e0b",
  force_synced: "#6366f1",
};
