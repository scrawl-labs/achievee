import App from "@/components/App";
import Landing from "@/components/Landing";
import { getSession } from "@/lib/auth";

export default async function Page() {
  return (await getSession()) ? <App /> : <Landing />;
}
