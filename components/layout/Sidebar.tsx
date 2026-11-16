"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Package,
  Receipt,
  ShieldAlert,
  Wrench,
  FolderLock,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

const navigationItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, current: true },
  { name: "Assets", href: "/assets", icon: Package, current: false },
  { name: "Receipts", href: "/receipts", icon: Receipt, current: false },
  { name: "Warranties", href: "/warranties", icon: ShieldAlert, current: false, badge: "3" },
  { name: "Maintenance", href: "/maintenance", icon: Wrench, current: false },
  { name: "Document Vault", href: "/vault", icon: FolderLock, current: false },
];

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button Floating Toggle */}
      <div className="fixed bottom-4 right-4 z-40 md:hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-in-out dark:border-slate-800 dark:bg-slate-900 md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-1 flex-col justify-between p-4">
          <nav className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overview
            </p>
            <div className="mt-2 space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      item.current
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4 w-4 ${
                          item.current
                            ? "text-indigo-600 dark:text-indigo-400"
                            : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200"
                        }`}
                      />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* AI Feature Callout */}
          <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-3.5 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-slate-900">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-900 dark:text-indigo-200">
              <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Cognia Intelligence</span>
            </div>
            <p className="mt-1 text-xs text-indigo-700/80 dark:text-indigo-300/70">
              Scan receipts and query warranties instantly using Gemini AI.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
