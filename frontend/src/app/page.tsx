import { redirect } from "next/navigation";

export default async function Home() {
  // Redirect to login page - authentication will be handled by the AuthProvider
  redirect('/login');
}
