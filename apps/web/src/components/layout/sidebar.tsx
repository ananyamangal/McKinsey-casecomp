"use client";

import { AnimatePresence, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@halo/utils";
import { Button } from "@halo/ui";
import { useUIStore } from "@/lib/store/ui-store";
import { Brand } from "./brand";
import { SidebarNav } from "./sidebar-nav";

function SidebarInner({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-2" : "px-5",
        )}
      >
        <Brand collapsed={collapsed} />
      </div>
      <SidebarNav collapsed={collapsed} onNavigate={onNavigate} />
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-3",
            collapsed && "hidden",
          )}
        >
          <p className="text-xs font-semibold text-foreground">AI Autopilot</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            3 agents online · 7 workflows running
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  return (
    <aside
      className={cn(
        "relative hidden shrink-0 border-r border-sidebar-border transition-[width] duration-300 ease-in-out lg:block",
        sidebarCollapsed ? "w-[76px]" : "w-64",
      )}
    >
      <div className="sticky top-0 h-screen">
        <SidebarInner collapsed={sidebarCollapsed} />
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 z-10 h-6 w-6 rounded-full bg-background shadow-sm"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="h-3.5 w-3.5" />
          ) : (
            <PanelLeftClose className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const { mobileSidebarOpen, setMobileSidebar } = useUIStore();

  return (
    <AnimatePresence>
      {mobileSidebarOpen && (
        <div className="lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileSidebar(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border shadow-elevated"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebar(false)}
              className="absolute right-2 top-3.5 z-10"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </Button>
            <SidebarInner collapsed={false} onNavigate={() => setMobileSidebar(false)} />
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
