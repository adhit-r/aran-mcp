import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await currentUser();

  if (user) {
    redirect('/dashboard');
  }

  // Show the home page for unauthenticated users
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-white">
      <div className="text-center max-w-md mx-auto p-8">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">MCP Sentinel</h1>
        <p className="text-lg mb-6 text-gray-600">
          Advanced MCP server monitoring and management platform
        </p>
        <div className="space-y-4">
          <a
            href="/sign-in"
            className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Sign In
          </a>
          <a
            href="/sign-up"
            className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Sign Up
          </a>
          <div className="text-sm text-gray-500 mt-4">
            <p>Backend API: <span className="font-mono">localhost:8081</span></p>
            <p>MCP Server: <span className="font-mono">localhost:3001</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}