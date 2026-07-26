import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { login, register, getMe } from '../lib/api';
import { useAuthStore } from '../store/useAuthStore';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setAuth = useAuthStore((s) => s.setAuth);

  const validate = (): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return 'Please enter your email.';
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) return 'Please enter a valid email.';
    if (!pass) return 'Please enter a password.';
    if (isRegister && pass.length < 8) return 'Password must be at least 8 characters.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Check your details', validationError);
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim();

      if (isRegister) {
        // Registration typically just creates the account and doesn't
        // return a usable session — log in separately afterward instead
        // of assuming the register response has an access_token.
        await register(trimmedEmail, pass);
        const loginResult = await login(trimmedEmail, pass);
        const me = await getMe(loginResult.access_token);
        setAuth(loginResult.access_token, me);
      } else {
        const loginResult = await login(trimmedEmail, pass);
        const me = await getMe(loginResult.access_token);
        setAuth(loginResult.access_token, me);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{isRegister ? 'Create account' : 'Log in'}</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#9ca3af"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        editable={!isSubmitting}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#9ca3af"
        value={pass}
        onChangeText={setPass}
        secureTextEntry
        editable={!isSubmitting}
      />

      <TouchableOpacity
        style={[styles.button, isSubmitting && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{isRegister ? 'Create account' : 'Log in'}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsRegister(!isRegister)} disabled={isSubmitting}>
        <Text style={styles.link}>
          {isRegister ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#111827' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 20, textAlign: 'center' },
  input: { backgroundColor: '#374151', color: '#fff', padding: 15, borderRadius: 8, marginBottom: 15 },
  button: { backgroundColor: '#2563eb', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  link: { color: '#60a5fa', textAlign: 'center' },
});