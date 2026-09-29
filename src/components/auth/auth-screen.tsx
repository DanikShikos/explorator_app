import type { ReactNode } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Emblem } from "@/components/brand/Emblem";

export function AuthScreen({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <Card className="border-border/80 bg-card/95 shadow-sm">
      <CardHeader>
        <Link
          href="/login"
          data-testid="app-emblem"
          className="mb-2 flex items-center gap-2 text-sm font-semibold"
        >
          <Emblem size={32} className="rounded-xl" />
          Учёный кот
        </Link>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
        <div className="text-sm text-muted-foreground">{footer}</div>
      </CardContent>
    </Card>
  );
}
