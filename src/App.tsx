// src/App.tsx
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
  useMantineTheme,
  Divider
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardPage } from './pages/DashboardPage';
import { JournalsPage } from './pages/JournalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { JournalProvider } from './contexts/JournalContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { JournalSelector } from './components/JournalSelector';
import { useState, useEffect } from 'react';
import { IconChartBar, IconCalendar } from '@tabler/icons-react';

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

// Calendar view placeholder
function CalendarView() {
  return (
    <Box p="xl" style={{ textAlign: 'center' }}>
      <IconCalendar size={48} stroke={1.5} />
      <Title order={2} mt="md">Trade Calendar</Title>
      <Text mt="md">A calendar view of your trades is coming soon!</Text>
    </Box>
  );
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
  const [desktopOpened, { toggle: toggleDesktop }] = useDisclosure(true);
  const theme = useMantineTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active view from current path
  const getActiveViewFromPath = (path: string) => {
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/journals')) return 'journals';
    if (path.startsWith('/statistics')) return 'statistics';
    if (path.startsWith('/calendar')) return 'calendar';
    if (path.startsWith('/settings')) return 'settings';
    return 'dashboard';
  };
  
  const activeView = getActiveViewFromPath(location.pathname);
  
  // Handle navigation from sidebar
  const handleNavigation = (view: string) => {
    navigate(`/${view}`);
    
    // Close mobile navigation when navigating
    if (mobileOpened) {
      toggleMobile();
    }
  };
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return <LoginPage />;
  }
  
  return (
    <AppShell
      padding="md"
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileOpened, desktop: !desktopOpened }
      }}
      header={{ height: 60 }}
    >
      <AppShell.Header>
  <Group h="100%" px="md" justify="space-between">
    <Group>
      <Burger
        opened={mobileOpened}
        onClick={toggleMobile}
        size="sm"
        color={theme.colors.gray[6]}
        hiddenFrom="sm"
      />
      <Burger
        opened={desktopOpened}
        onClick={toggleDesktop}
        size="sm"
        color={theme.colors.gray[6]}
        visibleFrom="sm"
      />
      <Title order={3}>Trading Journal</Title>
    </Group>
    
    <Group>
      {/* Only show journal selector when logged in and on certain pages */}
      {user && ['dashboard', 'journals', 'statistics', 'calendar'].includes(activeView) && (
        <Box style={{ width: '200px' }}>
          <JournalSelector />
        </Box>
      )}
      {user && <Divider orientation="vertical" />}
      {user && (
        <Text size="sm" fw={500}>
          {user.email}
        </Text>
      )}
    </Group>
  </Group>
</AppShell.Header>

      <AppShell.Navbar p="md">
        <Navigation
          opened={mobileOpened}
          onClose={() => toggleMobile()}
          onNavigate={handleNavigation}
          active={activeView}
          isCollapsed={!desktopOpened}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/journals" element={<JournalsPage />} />
          <Route path="/statistics" element={<PlaceholderView title="Statistics" />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <SupabaseProvider>
            <JournalProvider>
              <AppContent />
            </JournalProvider>
          </SupabaseProvider>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;