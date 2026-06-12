import { Redirect } from "expo-router";
import React from "react";

export default function ProfessionalIndex() {
  // Satisfies Expo Router's need for an index, while enforcing our Dashboard as the true home
  return <Redirect href="/(professional)/dashboard" />;
}