import { redirect } from "next/navigation";

export default function Home() {
  // El proxy (proxy.ts) redirige a /login si no hay sesión.
  redirect("/map");
}
