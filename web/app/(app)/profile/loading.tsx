import { SkPanel, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="25%" /><div className="split"><div className="stack"><SkPanel lines={2} /><SkPanel lines={8} /></div><SkPanel lines={1} /></div></section>
    </Skeleton>
  );
}
