import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <SignIn 
        appearance={{ elements: { formButtonPrimary: "bg-[#ff8b3d] hover:bg-[#ffa15c]" } }}
        fallbackRedirectUrl="/dashboard/overview"
      />
    </div>
  );
}


