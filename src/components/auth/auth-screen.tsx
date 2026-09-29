import type { ReactNode } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <Link href="/login" className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="size-4" />
          </span>
          Explorator
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
