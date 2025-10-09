import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-aran-gray-50 to-white">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold font-display mb-2">MCP Sentinel</h1>
          <p className="text-aran-gray-600">Sign in to your account</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "aran-card shadow-brutalLg",
              headerTitle: "font-display font-bold",
              headerSubtitle: "text-aran-gray-600",
              formButtonPrimary: "aran-btn-accent hover:shadow-brutalLg transition-all",
              formFieldInput: "aran-input",
              footerActionLink: "text-aran-orange hover:text-aran-orange-dark font-semibold",
              identityPreviewText: "font-semibold",
              formResendCodeLink: "text-aran-orange hover:text-aran-orange-dark",
            },
          }}
        />
      </div>
    </div>
  );
}



