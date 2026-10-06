import { SkQuestion, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="30%" /><SkQuestion /></section>
    </Skeleton>
  );
}
