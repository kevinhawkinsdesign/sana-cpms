"use client";

import { useCountry } from "@/lib/providers/country-provider";
import Link, { LinkProps } from "next/link";
import { useMemo } from "react";

type LocalizedLinkProps = LinkProps & {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function LocalizedLink({ href, children, className, style, ...props }: LocalizedLinkProps) {
  const { countryCode } = useCountry();

  const localizedHref = useMemo(() => {
    if (typeof href === "string") {
      return `/${countryCode}${href.startsWith("/") ? href : `/${href}`}`;
    }

    return href; // If it's an object { pathname, query }, skip processing
  }, [href, countryCode]);

  return (
    <Link href={localizedHref} className={className} style={style} {...props}>
      {children}
    </Link>
  );
}
