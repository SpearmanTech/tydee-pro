import { Redirect } from "expo-router";
import { useAuth } from "../context/AuthContext";

export default function Index() {
  const { user, loading, isOnboarded } = useAuth();

  if (loading) return null;

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  // If you renamed the file to dashboard.tsx, use this:
  return <Redirect href="/(professional)/dashboard" />;
}