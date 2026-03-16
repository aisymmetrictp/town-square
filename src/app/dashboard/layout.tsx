"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Users,
  ChevronDown,
  Trophy,
  AlertTriangle,
  BarChart3,
  UserX,
} from "lucide-react";

interface UserInfo {
  id: number;
  repName: string;
  repCode: string;
  role: string;
}

interface Rep {
  repName: string;
  repCode: string;
}

interface RepStatusInfo {
  repName: string;
  isActive: boolean;
}

// Module-level cache so data survives component remounts during navigation
let cachedUser: UserInfo | null = null;
let cachedReps: Rep[] = [];
let cachedRepStatuses: RepStatusInfo[] = [];
let userFetchPromise: Promise<void> | null = null;
let repsFetchPromise: Promise<void> | null = null;

function fetchUserData() {
  if (!userFetchPromise) {
    userFetchPromise = fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) cachedUser = data;
      })
      .catch(() => {});
  }
  return userFetchPromise;
}

function fetchRepsData() {
  if (!repsFetchPromise) {
    repsFetchPromise = Promise.all([
      fetch("/api/reps").then((r) => r.json()),
      fetch("/api/rep-status").then((r) => r.json()),
    ])
      .then(([repsData, statusData]) => {
        if (Array.isArray(repsData)) cachedReps = repsData;
        if (Array.isArray(statusData)) cachedRepStatuses = statusData;
      })
      .catch(() => {});
  }
  return repsFetchPromise;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Initialize from cache immediately so nav items show on remount
  const [user, setUser] = useState<UserInfo | null>(cachedUser);
  const [reps, setReps] = useState<Rep[]>(cachedReps);
  const [repStatuses, setRepStatuses] = useState<RepStatusInfo[]>(cachedRepStatuses);
  const [viewAs, setViewAs] = useState("");
  const [repActive, setRepActive] = useState("");

  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  // Fetch user data (uses module-level cache/dedup)
  useEffect(() => {
    fetchUserData().then(() => {
      if (cachedUser) setUser(cachedUser);
    });
  }, []);

  // Fetch reps data when user is manager/admin
  useEffect(() => {
    if (isManagerOrAdmin) {
      fetchRepsData().then(() => {
        setReps(cachedReps);
        setRepStatuses(cachedRepStatuses);
      });
    }
  }, [isManagerOrAdmin]);

  // Sync viewAs/repActive from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setViewAs(params.get("viewAs") ?? "");
      setRepActive(params.get("repActive") ?? "");
    }
  }, [pathname]);

  const repActiveMap = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const s of repStatuses) {
      map.set(s.repName, s.isActive);
    }
    return map;
  }, [repStatuses]);

  const { activeReps, inactiveReps } = useMemo(() => {
    const active: Rep[] = [];
    const inactive: Rep[] = [];
    for (const r of reps) {
      const status = repActiveMap.get(r.repName);
      if (status === false) {
        inactive.push(r);
      } else {
        active.push(r);
      }
    }
    return { activeReps: active, inactiveReps: inactive };
  }, [reps, repActiveMap]);

  const activeCount = activeReps.length;
  const inactiveCount = inactiveReps.length;

  const filterQs = useMemo(() => {
    const params = new URLSearchParams();
    if (viewAs) params.set("viewAs", viewAs);
    if (repActive) params.set("repActive", repActive);
    const str = params.toString();
    return str ? `?${str}` : "";
  }, [viewAs, repActive]);

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/invoices", label: "Invoices", icon: FileText },
    { href: "/dashboard/upload", label: "Upload", icon: Upload },
    ...(isManagerOrAdmin
      ? [
          { href: "/dashboard/leaderboard", label: "Leaderboard", icon: Trophy },
          { href: "/dashboard/write-off-risk", label: "Write-Off Risk", icon: AlertTriangle },
          { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
          { href: "/dashboard/unassigned", label: "Unassigned", icon: UserX },
        ]
      : []),
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Users", icon: Users }]
      : []),
  ];

  const handleViewAs = useCallback((repName: string) => {
    const params = new URLSearchParams(window.location.search);
    if (repName) {
      params.set("viewAs", repName);
    } else {
      params.delete("viewAs");
    }
    setViewAs(repName);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router]);

  const handleRepActive = useCallback((value: string) => {
    const params = new URLSearchParams(window.location.search);
    if (value) {
      params.set("repActive", value);
    } else {
      params.delete("repActive");
    }
    if (value === "inactive") {
      params.delete("viewAs");
      setViewAs("");
    }
    setRepActive(value);
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router]);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-[#0f172a] shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <Link href={`/dashboard${filterQs}`}>
            <Image
              src="/tsp-logo.png"
              alt="Town Square Publications"
              width={200}
              height={30}
              className="mb-1 brightness-0 invert"
            />
          </Link>
          <p className="text-[10px] text-slate-500 tracking-wide">
            Powered by AISymmetric
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 pt-5 flex flex-col gap-0.5">
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-4 mb-2">
            Navigation
          </p>
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={`${item.href}${filterQs}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-slate-800 text-white font-medium border-l-2 border-blue-500"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* View as Rep switcher */}
        {isManagerOrAdmin && reps.length > 0 && (
          <div className="px-3 pb-3 shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-4 mb-2">
              Rep View
            </p>
            <div className="relative">
              <select
                value={viewAs}
                onChange={(e) => handleViewAs(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1.5 text-xs appearance-none pr-7"
              >
                <option value="">All Reps (Manager View)</option>
                {activeReps.length > 0 && (
                  <optgroup label={`Active (${activeCount})`}>
                    {activeReps.map((r) => (
                      <option key={r.repName} value={r.repName}>
                        {r.repName}
                      </option>
                    ))}
                  </optgroup>
                )}
                {inactiveReps.length > 0 && (
                  <optgroup label={`Inactive (${inactiveCount})`}>
                    {inactiveReps.map((r) => (
                      <option key={r.repName} value={r.repName}>
                        {r.repName}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Rep Status filter */}
        {isManagerOrAdmin && (
          <div className="px-3 pb-3 shrink-0">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold px-4 mb-2">
              Rep Status
            </p>
            <div className="flex gap-1 px-1">
              {[
                { value: "", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRepActive(opt.value)}
                  className={`flex-1 text-[11px] py-1.5 rounded-md font-medium transition-colors ${
                    repActive === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  {opt.label}
                  {opt.value === "active" && activeCount > 0 && (
                    <span className="ml-1 text-[9px] opacity-70">{activeCount}</span>
                  )}
                  {opt.value === "inactive" && inactiveCount > 0 && (
                    <span className="ml-1 text-[9px] opacity-70">{inactiveCount}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User section */}
        <div className="border-t border-slate-800 p-3 shrink-0">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-white">
                {user?.repName ?? "Loading..."}
              </p>
              <p className="text-[10px] text-slate-500 uppercase">
                {user?.role ?? ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-[#0f172a] border-b border-slate-800">
        <div className="flex items-center justify-between p-3">
          <Link href={`/dashboard${filterQs}`} className="font-bold text-sm text-white">
            TSP
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={`${item.href}${filterQs}`}
                className="text-xs text-slate-300 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <UserButton />
          </div>
        </div>
        {isManagerOrAdmin && reps.length > 0 && (
          <div className="px-3 pb-2 flex gap-2">
            <div className="relative flex-1">
              <select
                value={viewAs}
                onChange={(e) => handleViewAs(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
              >
                <option value="">All Reps</option>
                {activeReps.length > 0 && (
                  <optgroup label={`Active (${activeCount})`}>
                    {activeReps.map((r) => (
                      <option key={r.repName} value={r.repName}>
                        {r.repName}
                      </option>
                    ))}
                  </optgroup>
                )}
                {inactiveReps.length > 0 && (
                  <optgroup label={`Inactive (${inactiveCount})`}>
                    {inactiveReps.map((r) => (
                      <option key={r.repName} value={r.repName}>
                        {r.repName}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="flex gap-0.5">
              {[
                { value: "", label: "All" },
                { value: "active", label: "Act" },
                { value: "inactive", label: "Inact" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleRepActive(opt.value)}
                  className={`text-[10px] px-2 py-1 rounded font-medium transition-colors ${
                    repActive === opt.value
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 bg-slate-50 p-6 md:p-8 mt-14 md:mt-0 overflow-auto">
        {viewAs && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-700">
              Viewing as: <strong>{viewAs}</strong>
              {repActiveMap.has(viewAs) && !repActiveMap.get(viewAs) && (
                <span className="ml-2 text-xs text-amber-600 font-medium">(Inactive)</span>
              )}
            </span>
            <button
              onClick={() => handleViewAs("")}
              className="text-xs text-blue-600 hover:underline ml-auto"
            >
              Exit rep view
            </button>
          </div>
        )}
        {repActive && !viewAs && (
          <div className="mb-4 flex items-center gap-3 bg-slate-100 border border-slate-200 rounded-lg px-4 py-2">
            <span className="text-sm text-slate-600">
              Showing: <strong className="capitalize">{repActive}</strong> reps
              {repActive === "active" && <span className="text-xs text-slate-400 ml-1">({activeCount})</span>}
              {repActive === "inactive" && <span className="text-xs text-slate-400 ml-1">({inactiveCount})</span>}
            </span>
            <button
              onClick={() => handleRepActive("")}
              className="text-xs text-slate-500 hover:underline ml-auto"
            >
              Show all
            </button>
          </div>
        )}
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        }>
          {children}
        </Suspense>
      </main>
    </div>
  );
}
