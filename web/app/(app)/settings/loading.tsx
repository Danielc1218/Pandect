import { SkPanel, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="25%" /><div className="split"><SkPanel lines={8} /><SkPanel lines={1} /></div></section>
    </Skeleton>
  );
}
