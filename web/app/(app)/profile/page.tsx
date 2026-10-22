import { ProfileForm, SettingsForm } from "@/components/SettingsForm";
import { SubmitButton } from "@/components/SubmitButton";
import { logOut } from "@/lib/auth";
import { op } from "@/lib/run";

export const metadata = { title: "Profile" };

// Who the learner is and what they are aiming for. How the site looks and behaves is on /settings.
export default async function Profile() {
  const { profile, email } = await op("profile");
  return (
    <section>
      <h1>Profile</h1>
      <div className="split">
        <div className="stack">
          <ProfileForm name={profile.display_name} />
          <SettingsForm profile={profile} />
        </div>
        <div className="panel">
          <h3>Account</h3>
          <p className="muted">{email}</p>
          <form className="actions" action={logOut}><SubmitButton className="btn" busy="Logging out…">Log out</SubmitButton></form>
        </div>
      </div>
    </section>
  );
}
