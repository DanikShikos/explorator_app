"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const routes = ["/", "/notes", "/notes/new", "/review", "/profile"];

export function RoutePrefetcher() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      routes.forEach((route) => router.prefetch(route));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [router]);

  return null;
}
