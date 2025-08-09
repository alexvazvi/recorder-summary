import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Grabadora', headerStyle: { backgroundColor: '#1C1C1E' }, headerTintColor: '#fff' }} />
      <Stack.Screen name="detail" options={{ title: 'Detalle', headerStyle: { backgroundColor: '#1C1C1E' }, headerTintColor: '#fff' }} />
    </Stack>
  );
}
