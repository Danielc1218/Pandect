import { DisplaySettings } from "@/components/DisplaySettings";

export const metadata = { title: "Settings" };

// Display and accessibility. Name, goals and account are on /profile.
export default function Settings() {
  return (
    <section>
      <h1>Settings</h1>
      <p className="muted">Changes show straight away and are saved to your account, so they follow you to other devices.</p>
      <DisplaySettings />
    </section>
  );
}
