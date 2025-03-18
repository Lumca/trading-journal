// src/components/ThemePicker.tsx - Fixed for MantineProvider compatibility
import { useEffect, useState } from 'react';
import { 
  ActionIcon, 
  Menu, 
  useMantineColorScheme,
  useMantineTheme,
  ColorSwatch,
  Group,
  Text,
  Tooltip
} from '@mantine/core';
import { IconPalette } from '@tabler/icons-react';

// Define our theme options
interface ThemeOption {
  key: string;
  name: string;
  colorScheme: 'light' | 'dark';
  primaryColor: string;
}

// Available themes
const themeOptions: ThemeOption[] = [
  { key: 'dark-blue', name: 'Dark Blue', colorScheme: 'dark', primaryColor: 'blue' },
  { key: 'dark-cyan', name: 'Dark Cyan', colorScheme: 'dark', primaryColor: 'cyan' },
  { key: 'dark-teal', name: 'Dark Teal', colorScheme: 'dark', primaryColor: 'teal' },
  { key: 'dark-green', name: 'Dark Green', colorScheme: 'dark', primaryColor: 'green' },
  { key: 'dark-violet', name: 'Dark Violet', colorScheme: 'dark', primaryColor: 'violet' },
  { key: 'dark-pink', name: 'Dark Pink', colorScheme: 'dark', primaryColor: 'pink' },
  { key: 'light-blue', name: 'Light Blue', colorScheme: 'light', primaryColor: 'blue' },
  { key: 'light-cyan', name: 'Light Cyan', colorScheme: 'light', primaryColor: 'cyan' },
  { key: 'light-teal', name: 'Light Teal', colorScheme: 'light', primaryColor: 'teal' },
  { key: 'light-green', name: 'Light Green', colorScheme: 'light', primaryColor: 'green' },
  { key: 'light-violet', name: 'Light Violet', colorScheme: 'light', primaryColor: 'violet' },
  { key: 'light-pink', name: 'Light Pink', colorScheme: 'light', primaryColor: 'pink' },
];

const STORAGE_KEY = 'trading-journal-theme';
const PRIMARY_COLOR_KEY = 'trading-journal-primary-color';

export function ThemePicker() {
  const theme = useMantineTheme();
  const { setColorScheme, colorScheme } = useMantineColorScheme();
  const [activeTheme, setActiveTheme] = useState<string>('dark-cyan'); // Default theme
  
  // Load saved theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme) {
      const themeOption = themeOptions.find(option => option.key === savedTheme);
      if (themeOption) {
        setActiveTheme(themeOption.key);
      }
    } else {
      // If no saved theme, set active theme based on current color scheme
      const defaultTheme = themeOptions.find(
        option => option.colorScheme === colorScheme && option.primaryColor === theme.primaryColor
      );
      if (defaultTheme) {
        setActiveTheme(defaultTheme.key);
      }
    }
  }, []);
  
  // Apply the selected theme
  const applyTheme = (themeOption: ThemeOption) => {
    // Set color scheme (light/dark)
    setColorScheme(themeOption.colorScheme);
    
    // Save the primary color to localStorage
    localStorage.setItem(PRIMARY_COLOR_KEY, themeOption.primaryColor);
    
    // Save full theme key to localStorage
    localStorage.setItem(STORAGE_KEY, themeOption.key);
    
    // Reload the page to apply the theme fully
    window.location.reload();
  };
  
  const handleThemeChange = (themeOption: ThemeOption) => {
    setActiveTheme(themeOption.key);
    applyTheme(themeOption);
  };
  
  return (
    <Menu shadow="md" width={200} position="bottom-end">
      <Menu.Target>
        <Tooltip label="Change Theme">
          <ActionIcon variant="subtle" color={theme.primaryColor}>
            <IconPalette size={18} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      
      <Menu.Dropdown>
        <Menu.Label>Theme Options</Menu.Label>
        {themeOptions.map((option) => (
          <Menu.Item
            key={option.key}
            onClick={() => handleThemeChange(option)}
            leftSection={
              <ColorSwatch 
                color={theme.colors[option.primaryColor][option.colorScheme === 'dark' ? 7 : 6]} 
                size={14}
              />
            }
            rightSection={
              activeTheme === option.key ? (
                <Text size="xs" c="dimmed">✓</Text>
              ) : null
            }
          >
            {option.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}