import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Create your account" };

export default function SignUp() {
  return <AuthForm mode="signup" />;
}
