"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Suspense, useEffect, useState } from "react";

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

  const isAdmin = user?.role === "admin";
  const isManagerOrAdmin = user?.role === "admin" || user?.role === "manager";

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: "📊" },
    { href: "/dashboard/invoices", label: "Invoices", icon: "📄" },
    { href: "/dashboard/upload", label: "Upload", icon: "📤" },
    ...(isAdmin
      ? [{ href: "/dashboard/admin", label: "Users", icon: "👥" }]
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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-gray-50 shrink-0">
        {/* Logo */}
        <div className="p-5 border-b">
          <Link href="/dashboard">
            <Image
              src="/tsp-logo.png"
              alt="Town Square Publications"
              width={200}
              height={30}
              className="mb-1"
            />
          </Link>
          <p className="text-[10px] text-gray-400 tracking-wide">
            Powered by AISymmetric
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-gray-200 font-medium"
                    : "hover:bg-gray-100 text-gray-600"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* View as Rep switcher */}
        {isManagerOrAdmin && reps.length > 0 && (
          <div className="px-3 pb-3">
            <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-1 px-1">
              View as Rep
            </label>
            <select
              value={viewAs}
              onChange={(e) => handleViewAs(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-xs bg-white"
            >
              <option value="">All Reps (Manager View)</option>
              {reps.map((r) => (
                <option key={r.repName} value={r.repName}>
                  {r.repName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* User section */}
        <div className="border-t p-3">
          <div className="flex items-center gap-3">
            <UserButton />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.repName ?? "Loading..."}
              </p>
              <p className="text-[10px] text-gray-400 uppercase">
                {user?.role ?? ""}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b">
        <div className="flex items-center justify-between p-3">
          <Link href="/dashboard" className="font-bold text-sm">
            TSP
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-xs text-gray-600 hover:text-black"
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
              className="w-full border rounded px-2 py-1 text-xs"
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
      <main className="flex-1 p-6 md:p-8 mt-14 md:mt-0 overflow-auto">
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
