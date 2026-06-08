import { Stack } from 'expo-router';

export default function EquipmentLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#f8fafc' },
      }}
    >
      {/* The Marketplace Home */}
      <Stack.Screen 
        name="rental-marketplace" 
        options={{
          title: 'Marketplace'
        }}
      />
      
      {/* The Rental Details Screen */}
      <Stack.Screen 
        name="rental-details" 
        options={{
          presentation: 'card', // Standard stack feel
          gestureEnabled: true,
        }}
      />
    </Stack>
  );
}