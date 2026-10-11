import { SkPanel, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="25%" /><SkPanel lines={1} /></section>
    </Skeleton>
  );
}
