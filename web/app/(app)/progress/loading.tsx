import { Bar, SkList, SkStats, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="25%" /><SkStats /></section>
      <section><Bar w="35%" h={26} /><SkList rows={6} /></section>
    </Skeleton>
  );
}
