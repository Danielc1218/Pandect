import { Bar, SkQuestion, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <header className="test-bar"><Bar w="30%" h={22} /></header>
      <div className="reader single"><SkQuestion /></div>
    </Skeleton>
  );
}
