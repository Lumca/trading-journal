// src/App.tsx
import {
  ActionIcon,
  AppShell,
  Box,
  Burger,
  Divider,
  Group,
  MantineProvider,
  Menu,
  Text,
  Title,
  createTheme,
  useMantineTheme
} from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { JournalSelector } from './components/JournalSelector';
import { Navigation } from './components/Navigation';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { JournalProvider } from './contexts/JournalContext';
import { SupabaseProvider } from './contexts/SupabaseContext';
import { CalendarPage } from './pages/CalendarPage';
import { DashboardPage } from './pages/DashboardPage';
import { JournalsPage } from './pages/JournalsPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { TradeDetailPage } from './pages/TradeDetailPage';
import { IconChevronDown } from '@tabler/icons-react';

// Define a custom theme with dark mode enabled by default
const theme = createTheme({
  fontFamily: 'Open Sans, sans-serif',
  primaryColor: 'cyan',
  colors: {
      // override dark colors here to change them for all components
      dark: [
        '#d5d7e0',
        '#acaebf',
        '#8c8fa3',
        '#666980',
        '#4d4f66',
        '#34354a',
        '#2b2c3d',
        '#1d1e30',
        '#0c0d21',
        '#01010a',
      ],
    },
});

function AppContent() {
  const { user, loading } = useAuth();
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
      // Modified AppShell.Header section for App.tsx

<AppShell.Header>
  <Group h="100%" px="md" style={{ justifyContent: 'space-between' }}>
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
      <Title order={3} size="h4" visibleFrom="xs" hiddenFrom="sm">TJ</Title>
      <Title order={3} visibleFrom="sm">Trading Journal</Title>
    </Group>
    
    {/* Mobile optimized right section */}
    <Box>
      <Group visibleFrom="md" spacing="md">
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
      
      {/* Mobile dropdown for Journal selector and user info */}
      <Menu shadow="md" width={200} position="bottom-end" hiddenFrom="md">
        <Menu.Target>
          <ActionIcon variant="subtle">
            <IconChevronDown size={18} />
          </ActionIcon>
        </Menu.Target>
        
        <Menu.Dropdown>
          {user && ['dashboard', 'journals', 'statistics', 'calendar'].includes(activeView) && (
            <>
              <Menu.Label>Journal</Menu.Label>
              <Box p="xs">
                <JournalSelector />
              </Box>
              <Menu.Divider />
            </>
          )}
          
          {user && (
            <>
              <Menu.Label>User</Menu.Label>
              <Menu.Item>
                <Text size="sm" fw={500} style={{ wordBreak: 'break-all' }}>
                  {user.email}
                </Text>
              </Menu.Item>
            </>
          )}
        </Menu.Dropdown>
      </Menu>
    </Box>
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
          <Route path="/trades/:tradeId" element={<TradeDetailPage />} />
          <Route path="/journals" element={<JournalsPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
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