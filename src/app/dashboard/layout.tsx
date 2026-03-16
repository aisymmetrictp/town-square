"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Suspense, useEffect, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Upload,
  Users,
  ChevronDown,
  Trophy,
  AlertTriangle,
  BarChart3,
  TrendingUp,
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p className="text-gray-500">Loading...</p></div>}>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </Suspense>
  );
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [reps, setReps] = useState<Rep[]>([]);
  const viewAs = searchParams.get("viewAs") ?? "";
  const repActive = searchParams.get("repActive") ?? "";

  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

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

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.id) setUser(data);
      });
  }, []);

  useEffect(() => {
    if (isManagerOrAdmin) {
      fetch("/api/reps")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) setReps(data);
        });
    }
  }, [isManagerOrAdmin]);

  function handleViewAs(repName: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (repName) {
      params.set("viewAs", repName);
    } else {
      params.delete("viewAs");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleRepActive(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("repActive", value);
    } else {
      params.delete("repActive");
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col bg-[#0f172a] shrink-0">
        {/* Logo */}
        <div className="p-5 border-b border-slate-800">
          <Link href="/dashboard">
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
        <nav className="flex-1 px-3 pt-5 flex flex-col gap-0.5">
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
                href={item.href}
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
          <div className="px-3 pb-3">
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
                {reps.map((r) => (
                  <option key={r.repName} value={r.repName}>
                    {r.repName}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Rep Status filter */}
        {isManagerOrAdmin && (
          <div className="px-3 pb-3">
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
                </button>
              ))}
            </div>
          </div>
        )}

        {/* User section */}
        <div className="border-t border-slate-800 p-3">
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
          <Link href="/dashboard" className="font-bold text-sm text-white">
            TSP
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-slate-300 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <UserButton />
          </div>
        </div>
        {isManagerOrAdmin && reps.length > 0 && (
          <div className="px-3 pb-2">
            <select
              value={viewAs}
              onChange={(e) => handleViewAs(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-2 py-1 text-xs"
            >
              <option value="">All Reps</option>
              {reps.map((r) => (
                <option key={r.repName} value={r.repName}>
                  {r.repName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main content */}
      <main className="flex-1 bg-slate-50 p-6 md:p-8 mt-14 md:mt-0 overflow-auto">
        {/* View-as banner */}
        {viewAs && (
          <div className="mb-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm text-blue-700">
              Viewing as: <strong>{viewAs}</strong>
            </span>
            <button
              onClick={() => handleViewAs("")}
              className="text-xs text-blue-600 hover:underline ml-auto"
            >
              Exit rep view
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
