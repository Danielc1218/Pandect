import { Bar, SkList, SkStats, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle /><SkStats n={3} /><Bar w={360} h={40} /><SkList rows={8} /></section>
    </Skeleton>
  );
}
