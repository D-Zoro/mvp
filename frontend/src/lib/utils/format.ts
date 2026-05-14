import type { BookCondition } from "@/types/book";
import type { OrderStatus } from "@/types/order";

const titleCase = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function formatPrice(value: string | number): string {
  const amount = typeof value === "string" ? Number.parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatCondition(condition: BookCondition): string {
  return titleCase(condition);
}

export function formatOrderStatus(status: OrderStatus): string {
  return titleCase(status);
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(iso));
}

export function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function getConditionColor(condition: BookCondition): string {
  if (condition === "new") return "bg-success-bg text-success";
  if (condition === "like_new") return "bg-primary/10 text-primary";
  return "bg-surface-muted text-foreground border border-border";
}

export function getOrderStatusColor(status: OrderStatus): string {
  if (status === "paid" || status === "delivered") return "bg-success-bg text-success";
  if (status === "cancelled" || status === "refunded") return "bg-surface-muted text-muted border border-border";
  return "bg-primary/10 text-primary";
}
