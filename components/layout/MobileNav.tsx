"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home", icon: "📊" },
  { href: "/ask", label: "Ask", icon: "✨" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/revolut", label: "Revolut", icon: "💳" },
  { href: "/deals", label: "Deals", icon: "🔥" },
  { href: "/status", label: "Status", icon: "⭐" },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors",
                isActive ? "text-accent" : "text-muted"
              )}
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
