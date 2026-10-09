import App from "@/components/App";
import Login from "@/components/Login";
import { getSession } from "@/lib/auth";

export default async function Page() {
  return (await getSession()) ? <App /> : <Login />;
}
