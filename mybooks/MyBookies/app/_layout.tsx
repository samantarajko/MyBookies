import { Stack } from 'expo-router';
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext'; // ✅ Add this import

function RootNavigator() {
  const { isLoggedIn } = useAuth();

  return (
    <Stack>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen
          name="auth"
          options={{ headerShown: false }}
        />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider> {/* ✅ Wrap your entire app here */}
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}
