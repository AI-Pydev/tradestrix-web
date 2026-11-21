"use client";

import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import {
  DEFAULT_PINNED_MODULE_IDS,
  getCategoryGroups,
  getVisibleModules,
  ModuleCategoryId,
  PlatformModule,
} from "@/components/platform-modules";
import { ArrowRightIcon, StarIcon } from "./icons";

const PINNED_STORAGE_KEY = "tradestrix.home.pinned";

interface ModuleCardProps {
  item: PlatformModule;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent, id: string) => void;
}

function ModuleCard({ item, isPinned, onTogglePin }: ModuleCardProps) {
  const Icon = item.icon;

  const cardInner = (
    <>
      <button
        type="button"
        onClick={(e) => onTogglePin(e, item.id)}
        className={`absolute top-3.5 right-3.5 card-favorite ${isPinned ? "active" : ""}`}
        aria-label={isPinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
        title={isPinned ? "Pinned to top" : "Pin to top"}
      >
        <StarIcon
          className={`w-4 h-4 transition-all ${
            isPinned
              ? "fill-[#E6B94B] text-[#E6B94B]"
              : "fill-none text-slate-600 hover:text-slate-400"
          }`}
          strokeWidth={1.5}
        />
      </button>

      <div className="flex items-start gap-3.5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${item.iconBg} ${item.iconBorder} ${item.iconColor} group-hover:scale-105 transition-transform`}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="min-w-0 pr-6">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#E4E9F2] group-hover:text-[#E6B94B] transition-colors leading-tight truncate">
              {item.label}
            </h3>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 shrink-0">
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-[#A7B1C3] mt-1.5 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end">
        <span className="inline-flex items-center gap-1.5 pl-3 pr-1 py-0.5 rounded-full text-xs font-semibold text-slate-300 bg-[#0B1322] border border-[rgba(148,163,184,0.14)] group-hover:border-[rgba(96,165,250,0.4)] group-hover:text-white transition-all shadow-sm">
          Open
          <span className="w-5 h-5 rounded-full bg-blue-500/15 text-[#6EA8FE] flex items-center justify-center group-hover:bg-[#6EA8FE] group-hover:text-slate-950 transition-colors">
            <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </span>
      </div>
    </>
  );

  const cardClasses =
    "group relative flex flex-col justify-between p-4 rounded-xl ts-card-soft overflow-hidden";

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        className={cardClasses}
      >
        {cardInner}
      </a>
    );
  }

  return (
    <Link href={item.href} className={cardClasses}>
      {cardInner}
    </Link>
  );
}

export function DashboardQuickAccessGrid() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [selectedCategory, setSelectedCategory] = useState<"all" | ModuleCategoryId>("all");
  const [pinnedIds, setPinnedIds] = useState<string[]>(DEFAULT_PINNED_MODULE_IDS);

  useEffect(() => {
    const stored = window.localStorage.getItem(PINNED_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setPinnedIds(parsed.filter((id): id is string => typeof id === "string"));
        }
      } catch {
      }
    }
  }, []);

  const visibleModules = useMemo(() => getVisibleModules(isAdmin), [isAdmin]);
  const categoryGroups = useMemo(() => getCategoryGroups(isAdmin), [isAdmin]);

  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const pinnedModules = useMemo(() => {
    const byId = new Map(visibleModules.map((mod) => [mod.id, mod]));
    return pinnedIds
      .map((id) => byId.get(id))
      .filter((mod): mod is PlatformModule => Boolean(mod));
  }, [pinnedIds, visibleModules]);

  const displayedGroups = useMemo(() => {
    if (selectedCategory === "all") {
      return categoryGroups;
    }
    return categoryGroups.filter((group) => group.id === selectedCategory);
  }, [categoryGroups, selectedCategory]);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Pinned Row */}
      {pinnedModules.length > 0 && (
        <section aria-label="Pinned Modules" className="space-y-3">
          <div className="flex items-center gap-2">
            <StarIcon className="w-4 h-4 fill-[#E6B94B] text-[#E6B94B]" />
            <h2 className="text-sm font-bold text-[#E4E9F2] tracking-tight">Pinned</h2>
            <span className="text-xs text-[#A7B1C3]">Your most-used modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {pinnedModules.map((item) => (
              <ModuleCard
                key={`pinned-${item.id}`}
                item={item}
                isPinned={true}
                onTogglePin={togglePin}
              />
            ))}
          </div>
        </section>
      )}

      {/* 2. Browse by Category */}
      <section aria-label="Browse by category" className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-[#E4E9F2] tracking-tight">
            Browse by category
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                selectedCategory === "all"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
              }`}
            >
              <span>All</span>
              <span className="text-[11px] font-mono opacity-75">{visibleModules.length}</span>
            </button>

            {categoryGroups.map((group) => {
              const active = selectedCategory === group.id;
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setSelectedCategory(group.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    active
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <span>{group.title}</span>
                  <span className="text-[11px] font-mono opacity-75">{group.items.length}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          {displayedGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${group.iconBg} ${group.iconBorder} ${group.iconColor}`}
                  >
                    <GroupIcon className="w-3.5 h-3.5" />
                  </span>
                  <h3 className="text-sm font-bold text-[#E4E9F2] tracking-tight">
                    {group.title}
                  </h3>
                  <span className="text-xs text-[#A7B1C3]">{group.description}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {group.items.map((item) => (
                    <ModuleCard
                      key={item.id}
                      item={item}
                      isPinned={pinnedSet.has(item.id)}
                      onTogglePin={togglePin}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
