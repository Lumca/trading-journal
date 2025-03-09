// src/components/Navigation.tsx
import { NavLink, Box, rem } from '@mantine/core';
import { 
  IconDashboard, 
  IconChartBar, 
  IconSettings, 
  IconCalendar,
  IconLogout,
  IconBook
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  opened: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  active: string;
  isCollapsed: boolean;
}

export function Navigation({ opened, onClose, onNavigate, active, isCollapsed }: NavigationProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const links = [
    { icon: IconDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: IconBook, label: 'Journals', value: 'journals' },
    { icon: IconChartBar, label: 'Statistics', value: 'statistics' },
    { icon: IconCalendar, label: 'Calendar', value: 'calendar' },
    { icon: IconSettings, label: 'Settings', value: 'settings' },
  ];

  const handleNavClick = (value: string) => {
    onNavigate(value);
  };
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Box style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box style={{ flex: 1 }}>
        {links.map((link) => (
          <NavLink
            key={link.value}
            label={isCollapsed ? '' : link.label}
            leftSection={<link.icon size={24} stroke={1.5} />}
            active={link.value === active}
            onClick={() => handleNavClick(link.value)}
            mb={rem(8)}
            p={isCollapsed ? 'xs' : undefined}
            childrenOffset={isCollapsed ? 0 : undefined}
            justifyContent={isCollapsed ? 'center' : undefined}
          />
        ))}
      </Box>

      <Box mt="auto">
        <NavLink
          label={isCollapsed ? '' : 'Logout'}
          leftSection={<IconLogout size={24} stroke={1.5} />}
          onClick={handleSignOut}
          p={isCollapsed ? 'xs' : undefined}
          justifyContent={isCollapsed ? 'center' : undefined}
        />
      </Box>
    </Box>
  );
}