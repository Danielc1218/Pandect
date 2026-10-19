import { ProfileForm, SettingsForm } from "@/components/SettingsForm";
import { logOut } from "@/lib/auth";
import { requireUser } from "@/lib/supabase";

export const metadata = { title: "Profile" };

// Who the learner is and what they are aiming for. How the site looks and behaves is on /settings.
export default async function Profile() {
  const { db, user } = await requireUser();
  const { data: profile } = await db.from("profiles").select("display_name, target_score, curr_score, test_date, weekly_goal").eq("id", user.id).single();
  return (
    <section>
      <h1>Profile</h1>
      <div className="split">
        <div className="stack">
          <ProfileForm name={profile!.display_name} />
          <SettingsForm profile={profile!} />
        </div>
        <div className="panel">
          <h3>Account</h3>
          <p className="muted">{user.email}</p>
          <form className="actions" action={logOut}><button className="btn">Log out</button></form>
        </div>
      </div>
    </section>
  );
}
