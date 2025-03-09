// src/App.tsx
// Updated to include the CalendarPage component
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { 
  MantineProvider, 
  createTheme, 
  AppShell,
  Group, 
  Title, 
  Button,
  Burger,
  Text,
  Box,
  useMantineTheme
} from '@mantine/core';
import { DashboardPage } from './pages/DashboardPage';
import { JournalsPage } from './pages/JournalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { CalendarPage } from './pages/CalendarPage'; // Import the new CalendarPage
import { SupabaseProvider } from './contexts/SupabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { useState } from 'react';
import { IconChartBar } from '@tabler/icons-react';

// Define a custom theme
const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  // You can customize colors, fonts, spacing, etc. here
});

// A placeholder component for other views
function PlaceholderView({ title }: { title: string }) {
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <IconChartBar size={48} stroke={1.5} />
      <Title order={2} mt="md">{title} View</Title>
      <Text mt="md">This feature is coming soon!</Text>
    </Box>
  );
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [opened, setOpened] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const theme = useMantineTheme();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <LoginPage />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardPage />;
      case 'journals':
        return <JournalsPage />;
      case 'statistics':
        return <PlaceholderView title="Statistics" />;
      case 'calendar':
        return <CalendarPage />; // Use our new CalendarPage component
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };
  
  return (
    <AppShell
      padding="md"
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !opened }
      }}
      header={{ height: 60 }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              size="sm"
              color={theme.colors.gray[6]}
              hiddenFrom="sm"
            />
            <Title order={3}>Trading Journal</Title>
          </Group>
          <Group>
            <Text size="sm" fw={500}>
              {user.email}
            </Text>
            <Button variant="subtle" onClick={signOut}>
              Sign Out
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Navigation
          opened={opened}
          onClose={() => setOpened(false)}
          onNavigate={setActiveView}
          active={activeView}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {renderView()}
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <AuthProvider>
        <SupabaseProvider>
          <AppContent />
        </SupabaseProvider>
      </AuthProvider>
    </MantineProvider>
  );
}

export default App;