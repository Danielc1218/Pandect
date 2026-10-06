import { Bar, SkPanel, SkStats, SkTitle, Skeleton } from "@/components/Skeleton";

// Home and About. Log-in and sign-up have their own, shaped like the form.
export default function Loading() {
  return (
    <Skeleton>
      <section><SkTitle w="60%" /><Bar w="70%" h={20} /><Bar w="45%" h={20} /></section>
      <section><SkStats /></section>
      <section><Bar w="30%" h={26} /><SkPanel lines={4} /></section>
    </Skeleton>
  );
}
