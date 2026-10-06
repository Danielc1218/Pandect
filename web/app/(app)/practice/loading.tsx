import { Bar, SkList, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle /><Bar w={300} h={40} /><SkList rows={8} /></section>
    </Skeleton>
  );
}
