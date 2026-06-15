import { Stack } from "expo-router";

export default function CollaborationsLayout() {
  return (
    <Stack 
      screenOptions={{ 
        headerShown: false, // Hides the default headers since you built custom ones
        animation: 'slide_from_right' // Smooth native-like transitions
      }}
    >
      {/* The main hub screen */}
      <Stack.Screen name="collaborations" />
      
      {/* The squad creation flow */}
      <Stack.Screen name="create-squad-job" />
      <Stack.Screen name="squad-marketplace" />
      
      {/* The squad interaction & details screens */}
      <Stack.Screen name="squad-job-details" />
      <Stack.Screen name="squad-chat" />
      <Stack.Screen name="squad-call" />
    </Stack>
  );
}