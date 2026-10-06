import { Bar, SkList, SkPanel, SkStats, SkTitle, Skeleton } from "@/components/Skeleton";

export default function Loading() {
  return (
    <Skeleton>
      <section>
        <SkTitle />
        <div className="split">
          <div className="card wide"><div className="photo" /><div className="body"><Bar w="40%" h={22} /><Bar w="55%" h={24} /><Bar w="30%" h={14} /><Bar h={8} /></div></div>
          <SkPanel />
        </div>
      </section>
      <section><SkStats /></section>
      <section><Bar w="30%" h={26} /><SkList rows={3} /></section>
    </Skeleton>
  );
}
