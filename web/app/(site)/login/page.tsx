import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Log in" };

export default async function LogIn({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}
