// next/link on react-router. Pages load on demand, so there is nothing to prefetch.
import type { ComponentProps } from "react";
import { Link as RouterLink } from "react-router";

type Props = Omit<ComponentProps<"a">, "href"> & { href: string; prefetch?: boolean | null };

export default function Link({ href, prefetch: _prefetch, ...rest }: Props) {
  return <RouterLink to={href} {...rest} />;
}
