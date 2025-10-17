import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  try {
    const user = await currentUser();
    
    if (user) {
      redirect('/dashboard');
    } else {
      redirect('/sign-in');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    redirect('/sign-in');
  }
}
