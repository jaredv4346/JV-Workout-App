"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "H" },
  { href: "/history", label: "History", icon: "L" },
  { href: "/progress", label: "Progress", icon: "G" },
  { href: "/bodyweight", label: "Weight", icon: "W" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-card-border flex justify-around items-center h-16 z-50">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full text-xs transition-colors ${
              isActive ? "text-accent" : "text-muted"
            }`}
          >
            <span className="text-lg font-bold">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
