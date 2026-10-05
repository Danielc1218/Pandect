import { SettingsForm } from "@/components/SettingsForm";
import { logOut } from "@/lib/auth";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Settings" };

export default async function Settings() {
  const { db, user } = await requireUser();
  const { data: profile } = await db.from("profiles").select("display_name, target_score, curr_score, test_date, weekly_goal").eq("id", user.id).single();
  return (
    <section>
      <h1>Settings</h1>
      <div className="split">
        <SettingsForm profile={profile!} />
        <div className="panel">
          <h3>Account</h3>
          <p className="muted">{user.email}</p>
          <form className="actions" action={logOut}><button className="btn">Log out</button></form>
        </div>
      </div>
    </section>
  );
}
