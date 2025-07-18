import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';


import { useAuth } from './context/AuthContext';

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000'; 


const Logo = require('../assets/images/TitleLogin.png');

export default function AuthScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async () => {
    const endpoint = mode === 'login' ? '/login' : '/register';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', `User ID: ${data.user_id}`);
        login(data.user_id);
      } else {
        Alert.alert('Error', data.error || 'Unknown error');
      }
    } catch (e) {
      if (e instanceof Error) {
        Alert.alert('Network error', e.message);
      } else {
        Alert.alert('Network error', 'An unknown error occurred');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.background}
    >
      <ImageBackground
        source={require('../assets/images/background.jpg')}
        style={styles.background}
      >
        <View style={styles.logoContainer}>
          <Image source={Logo} style={styles.logo} resizeMode="contain" />
        </View>
        <View style={styles.container}>
          <TextInput
            style={styles.input}
            placeholder="Username"
            autoCapitalize="none"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>
              {mode === 'login' ? 'Login' : 'Register'}
            </Text>
          </TouchableOpacity>
          <Text
            style={styles.switch}
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login'
              ? "Don't have an account? Register"
              : 'Already have an account? Login'}
          </Text>
        </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 100,
    marginBottom: 50,
  },
  logo: {
    width: 300,
  },
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1.2,
    borderColor: "black",
    borderRadius: 10,
    padding: 12,
    marginBottom: 30,
    backgroundColor: 'white',
    width: '80%',
    alignSelf: 'center'
  },
  switch: {
    color: 'blue',
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',

  },
  button: {
    backgroundColor: '#AECFA4',
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 10,
    width: 112,
    height: 42,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  buttonText: {
  fontWeight: 'bold',
  }

});
