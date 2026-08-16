import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import LandingExperience from "@/components/LandingExperience";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    const role = (session.user as any).role;
    if (["ADMIN", "SUPER_ADMIN"].includes(role)) redirect("/admin");
    if (role === "DOCTOR") redirect("/doctor");
    redirect("/frontdesk");
  }

  return <LandingExperience />;
}
