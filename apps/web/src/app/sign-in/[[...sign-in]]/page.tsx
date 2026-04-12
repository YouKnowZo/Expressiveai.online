import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 px-4">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" appearance={{ variables: { colorPrimary: '#4f46e5' } }} />
    </div>
  );
}
