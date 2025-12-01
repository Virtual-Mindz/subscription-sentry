import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <SignUp 
        appearance={{ elements: { formButtonPrimary: "bg-[#ff8b3d] hover:bg-[#ffa15c]" } }}
        fallbackRedirectUrl="/dashboard/overview"
      />
    </div>
  );
}


