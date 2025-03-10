// src/pages/LoginPage.tsx
import {
  Anchor,
  Button,
  Container,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

type FormMode = 'login' | 'register' | 'forgotPassword';

export function LoginPage() {
  const [mode, setMode] = useState<FormMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { signIn, signUp, forgotPassword } = useAuth();

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => {
        if (mode === 'forgotPassword') return null;
        return value.length < 6 ? 'Password must be at least 6 characters' : null;
      },
      confirmPassword: (value, values) => {
        if (mode !== 'register') return null;
        return value !== values.password ? 'Passwords do not match' : null;
      },
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'login') {
        const { error } = await signIn(values.email, values.password);
        if (error) throw error;
      } else if (mode === 'register') {
        const { error } = await signUp(values.email, values.password);
        if (error) throw error;
        setSuccessMessage('Registration successful! Please check your email for confirmation.');
        setMode('login');
      } else if (mode === 'forgotPassword') {
        const { error } = await forgotPassword(values.email);
        if (error) throw error;
        setSuccessMessage('If an account exists, a password reset link will be sent to your email.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: FormMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    form.reset();
  };

  return (
    <Container size={420} my={40}>
      <Title ta="center" fw={900}>
        Trading Journal
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        {mode === 'login'
          ? "Don't have an account yet? "
          : mode === 'register'
          ? 'Already have an account? '
          : 'Remember your password? '}
        <Anchor
          size="sm"
          component="button"
          onClick={() =>
            toggleMode(
              mode === 'login' ? 'register' : mode === 'register' ? 'login' : 'login'
            )
          }
        >
          {mode === 'login'
            ? 'Create account'
            : mode === 'register'
            ? 'Login'
            : 'Back to login'}
        </Anchor>
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Title order={3} ta="center" mb="md">
          {mode === 'login'
            ? 'Welcome back!'
            : mode === 'register'
            ? 'Create an account'
            : 'Reset your password'}
        </Title>

        {error && (
          <Text c="red" size="sm" ta="center" mb="sm">
            {error}
          </Text>
        )}

        {successMessage && (
          <Text c="green" size="sm" ta="center" mb="sm">
            {successMessage}
          </Text>
        )}

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder="your@email.com"
              {...form.getInputProps('email')}
            />

            {mode !== 'forgotPassword' && (
              <PasswordInput
                required
                label="Password"
                placeholder="Your password"
                {...form.getInputProps('password')}
              />
            )}

            {mode === 'register' && (
              <PasswordInput
                required
                label="Confirm Password"
                placeholder="Confirm your password"
                {...form.getInputProps('confirmPassword')}
              />
            )}

            {mode === 'login' && (
              <Anchor
                component="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  toggleMode('forgotPassword');
                }}
                style={{ alignSelf: 'flex-end' }}
                type="button"
              >
                Forgot password?
              </Anchor>
            )}
          </Stack>

          <Button fullWidth mt="xl" type="submit" loading={loading}>
            {mode === 'login'
              ? 'Sign in'
              : mode === 'register'
              ? 'Create account'
              : 'Reset password'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}