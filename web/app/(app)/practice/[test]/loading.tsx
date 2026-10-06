import { Bar, SkList, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><Bar w="25%" h={14} /><SkTitle /><SkList rows={4} /></section>
    </Skeleton>
  );
}
