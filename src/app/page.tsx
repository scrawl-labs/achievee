import App from "@/components/App";
import { googleConfigured } from "@/lib/auth";

export default function Page() {
  return <App googleReady={googleConfigured()} />;
}
