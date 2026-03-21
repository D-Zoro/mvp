"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { UserRole } from "@/lib/api/types";
import { useAuthStore } from "@/store/authStore";

interface RoleGuardProps {
  children: React.ReactNode;
  allow: UserRole[];
  redirectTo?: string;
}

export default function RoleGuard({
  children,
  allow,
  redirectTo = "/",
}: RoleGuardProps) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const hasRole = Boolean(user?.role && allow.includes(user.role));

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }
    if (!hasRole) {
      router.replace(redirectTo);
    }
  }, [hasRole, isAuthenticated, redirectTo, router]);

  if (!isAuthenticated || !hasRole) return null;

  return <>{children}</>;
}
