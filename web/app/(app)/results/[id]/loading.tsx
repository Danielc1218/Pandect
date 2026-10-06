import { Bar, SkList, SkStats, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><Bar w="30%" h={14} /><SkTitle /><SkStats /></section>
      <section><Bar w="30%" h={26} /><SkList rows={4} /></section>
    </Skeleton>
  );
}
