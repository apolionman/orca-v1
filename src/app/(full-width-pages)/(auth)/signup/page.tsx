import SignUpForm from "@/components/auth/SignUpForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Welcome AF Crew | Signing Up",
  description: "Sign Up your account here",
  // other metadata
};

export default function SignUp() {
  return <SignUpForm />;
}
