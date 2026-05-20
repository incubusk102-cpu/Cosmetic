import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { Landing } from "@/components/landing/Landing";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/scan");
  }
  return <Landing />;
}
