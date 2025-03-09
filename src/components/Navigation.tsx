// src/components/Navigation.tsx
import { useState } from 'react';
import { NavLink, Group, Box, rem, UnstyledButton } from '@mantine/core';
import { 
  IconDashboard, 
  IconChartBar, 
  IconSettings, 
  IconCalendar,
  IconChevronRight,
  IconChevronLeft,
  IconLogout,
  IconBook
} from '@tabler/icons-react';
import { useAuth } from '../contexts/AuthContext';

interface NavigationProps {
  opened: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  active: string;
}

export function Navigation({ opened, onClose, onNavigate, active }: NavigationProps) {
  const { signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    { icon: IconDashboard, label: 'Dashboard', value: 'dashboard' },
    { icon: IconBook, label: 'Journals', value: 'journals' },
    { icon: IconChartBar, label: 'Statistics', value: 'statistics' },
    { icon: IconCalendar, label: 'Calendar', value: 'calendar' },
    { icon: IconSettings, label: 'Settings', value: 'settings' },
  ];

  const handleNavClick = (value: string) => {
    onNavigate(value);
    if (opened) {
      onClose();
    }
  };

  return (
    <Box>
      <Box style={{ display: 'flex', justifyContent: 'flex-end' }} mb="xl">
        <UnstyledButton 
          onClick={() => setCollapsed(!collapsed)}
          style={{ color: 'gray' }}
        >
          {collapsed ? <IconChevronRight size={18} /> : <IconChevronLeft size={18} />}
        </UnstyledButton>
      </Box>
      
      <Box style={{ flex: 1 }}>
        {links.map((link) => (
          <NavLink
            key={link.value}
            label={collapsed ? '' : link.label}
            leftSection={<link.icon size={24} stroke={1.5} />}
            active={link.value === active}
            onClick={() => handleNavClick(link.value)}
            mb={rem(8)}
          />
        ))}
      </Box>

      <Box mt="auto">
        <NavLink
          label={collapsed ? '' : 'Logout'}
          leftSection={<IconLogout size={24} stroke={1.5} />}
          onClick={signOut}
        />
      </Box>
    </Box>
  );
}