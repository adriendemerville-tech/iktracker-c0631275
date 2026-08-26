import { startOfWeek, startOfMonth, startOfYear } from "date-fns";

export interface AdminStatsData {
  total_users: number;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

export interface DownloadStatsData {
  total_clicks: number;
  unique_users: number;
  avg_clicks_per_user: number;
  pct_users_clicked: number;
}

export interface ShareStatsData {
  total_shares: number;
  unique_sharers: number;
  pct_users_shared: number;
}

export interface TakeoutImportStatsData {
  total_attempts: number;
  successful_imports: number;
  unique_users_imported: number;
}

export interface CalendarConnectionStatsData {
  provider: string;
  total_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
}

export interface MarketingStatsData {
  total_views: number;
  unique_sessions: number;
  total_cta_clicks: number;
  total_simulations: number;
  total_signup_clicks: number;
  total_crawlers_clicks: number;
  mobile_views: number;
  desktop_views: number;
  tablet_views: number;
  mobile_pct: number;
  desktop_pct: number;
}

export interface MarketingViewsByDay {
  day: string;
  views: number;
  unique_visitors: number;
}

export interface SignupClicksByDay {
  day: string;
  clicks: number;
}

export interface MarketingStatsByPage {
  page: string;
  views: number;
  cta_clicks: number;
  simulations: number;
}

export interface TopUser {
  user_id: string;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

export interface RecentSignup {
  user_id: string;
  email: string;
  created_at: string;
}

export interface MonthlyStats {
  month: string;
  total_users: number;
  total_trips: number;
  total_km: number;
  total_ik: number;
}

export type PeriodFilter = "week" | "month" | "year" | "all";
export type Granularity = "day" | "week" | "month";
export type TopUserSort = "trips" | "km" | "ik";

export const granularityConfig: Record<Granularity, { label: string; labelFr: string }> = {
  day: { label: "Jour", labelFr: "par jour" },
  week: { label: "Semaine", labelFr: "par semaine" },
  month: { label: "Mois", labelFr: "par mois" },
};

export const periodConfig: Record<
  PeriodFilter,
  { label: string; daysBack: number; getStartDate: () => Date }
> = {
  week: {
    label: "Semaine",
    daysBack: 7,
    getStartDate: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  },
  month: {
    label: "Mois",
    daysBack: 30,
    getStartDate: () => startOfMonth(new Date()),
  },
  year: {
    label: "Année",
    daysBack: 365,
    getStartDate: () => startOfYear(new Date()),
  },
  all: {
    label: "Tout",
    daysBack: 3650,
    getStartDate: () => new Date("2020-01-01"),
  },
};

export const DEFAULT_SECTION_ORDER = [
  "main-stats",
  "dau-chart",
  "unique-visitors-chart",
  "signup-funnel",
  "ab-test",
  "search-console",
  "recent-signups",
  "persona-distribution",
  "calendar-connection-stats",
  "download-stats",
  "share-stats",
  "referral-sources",
  "comparison-chart",
  "registrations-chart",
  "recurring-trips-stats",
  "top-users",
];

export const DEFAULT_MARKETING_SECTION_ORDER = [
  "marketing-views-chart",
  "marketing-signup-clicks-chart",
  "bareme-simulations-chart",
  "marketing-stats-by-page",
];
