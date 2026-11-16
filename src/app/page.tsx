import { getServerSession } from "@/lib/server-session";
import { redirect } from "@/lib/server-session";
import { authOptions } from "@/lib/auth";
import LandingExperience from "@/components/LandingExperience";
import { defaultPortalPath } from "@/lib/portal-access";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(defaultPortalPath((session.user as any).role));
  }

  return <LandingExperience />;
}
