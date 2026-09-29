import Image from "next/image";
import { cn } from "@/lib/utils";

type EmblemProps = {
  className?: string;
  size?: number;
  alt?: string;
};

/** Flat kawaii scholar-cat face — big anime eyes + mortarboard, Duo-style sidebar logo. */
export function Emblem({ className, size = 48, alt = "Учёный кот" }: EmblemProps) {
  return (
    <Image
      src="/brand/emblem.png"
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
      priority
      unoptimized
    />
  );
}
