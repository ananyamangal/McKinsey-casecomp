import {
  LayoutDashboard,
  Users,
  Car,
  Wrench,
  Boxes,
  ShoppingCart,
  Wallet,
  BarChart3,
  Bot,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  section: "primary" | "system";
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, section: "primary" },
  { label: "Customers", href: "/customers", icon: Users, section: "primary" },
  { label: "Vehicles", href: "/vehicles", icon: Car, section: "primary" },
  { label: "Workshop", href: "/workshop", icon: Wrench, section: "primary" },
  { label: "Inventory", href: "/inventory", icon: Boxes, section: "primary" },
  { label: "Procurement", href: "/procurement", icon: ShoppingCart, section: "primary" },
  { label: "Finance", href: "/finance", icon: Wallet, section: "primary" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, section: "primary" },
  { label: "AI Center", href: "/ai-center", icon: Bot, badge: "3", section: "primary" },
  { label: "Settings", href: "/settings", icon: Settings, section: "system" },
];
