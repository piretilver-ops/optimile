"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/ask", label: "Ask Optimile", icon: "✨" },
  { href: "/search", label: "Award Search", icon: "🔍" },
  { href: "/revolut", label: "Revolut Optimizer", icon: "💳" },
  { href: "/deals", label: "Deals", icon: "🔥" },
  { href: "/status", label: "Status Match", icon: "⭐" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-border bg-card">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold text-accent">OPTIMILE</span>
        </Link>
        <p className="text-xs text-muted mt-1">Miles Optimizer</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-white"
                  : "text-foreground/70 hover:bg-accent-light hover:text-accent"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Settings link */}
      <div className="p-4 border-t border-border">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent text-white"
              : "text-foreground/70 hover:bg-accent-light hover:text-accent"
          )}
        >
          <span className="text-lg">⚙️</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
