"use client";

import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/layout/page-container";
import { useAuthStore } from "@/store/auth.store";

export default function ProfilePage() {
  const user = useAuthStore((state) => state.user);
  return (
    <PageContainer className="py-8">
      <h1 className="mb-8 font-serif text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">Profile</h1>
      <Card>
        <CardHeader><h2 className="font-serif text-2xl font-semibold leading-snug text-foreground sm:text-3xl">Account</h2></CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar src={user?.avatar_url} alt={user?.email ?? "User"} className="h-14 w-14" />
          <div>
            <p className="font-sans text-base font-medium text-foreground">{[user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Books4All user"}</p>
            <p className="font-sans text-sm text-muted">{user?.email ?? "Sign in to view profile details"}</p>
            <p className="font-sans text-sm text-muted">{user?.role ?? "guest"}</p>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
