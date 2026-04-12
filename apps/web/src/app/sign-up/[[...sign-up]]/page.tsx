import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 px-4">
      <SignUp path="/sign-up" routing="path" signInUrl="/sign-in" appearance={{ variables: { colorPrimary: '#4f46e5' } }} />
    </div>
  );
}
