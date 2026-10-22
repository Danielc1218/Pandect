// The route prop types Next generates for web/ (in .next/types), as src/router.tsx passes them.
type LayoutProps<_Route extends string> = { children: import("react").ReactNode };
type PageProps<_Route extends string> = {
  params: Promise<Record<string, string>>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
