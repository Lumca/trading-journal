// src/pages/SettingsPage.tsx
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  Card,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  MultiSelect,
  PasswordInput,
  Stack,
  Switch,
  Tabs,
  Text,
  TextInput,
  Title
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconCheck, IconInfoCircle, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { AssetClass, UserSettings } from '../lib/types';

export function SettingsPage() {
  const { getUserSettings, updateUserSettings } = useSupabase();
  const { resetPassword } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [newIndicator, setNewIndicator] = useState('');
  const [newStrategy, setNewStrategy] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('general');
  const [selectedAssetClass, setSelectedAssetClass] = useState<AssetClass>('forex');

  const passwordForm = useForm({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validate: {
      newPassword: (value) => (value.length < 6 ? 'Password must be at least 6 characters' : null),
      confirmPassword: (value, values) => (value !== values.newPassword ? 'Passwords do not match' : null),
    },
  });

  const form = useForm<{
    enable_registration: boolean;
    custom_symbols: string[];
    custom_indicators: string[];
    custom_strategies: string[];
    default_asset_classes: {
      forex: string[];
      crypto: string[];
      stocks: string[];
      [key: string]: string[];
    };
    default_indicators: string[];
    default_strategies: string[];
  }>({
    initialValues: {
      enable_registration: true,
      custom_symbols: [],
      custom_indicators: [],
      custom_strategies: [],
      default_asset_classes: {
        forex: [],
        crypto: [],
        stocks: []
      },
      default_indicators: [],
      default_strategies: []
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const settings = await getUserSettings();
      if (settings) {
          form.setValues({
        enable_registration: settings.enable_registration !== undefined ? settings.enable_registration : true,
        custom_symbols: settings.custom_symbols || [],
        custom_indicators: settings.custom_indicators || [],
        custom_strategies: settings.custom_strategies || [],
        default_asset_classes: settings.default_asset_classes || {
          forex: [],
          crypto: [],
          stocks: []
        },
        default_indicators: settings.default_indicators || [],
        default_strategies: settings.default_strategies || []
      });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (values: typeof form.values) => {
    setSaving(true);
    try {
      await updateUserSettings(values);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (values: typeof passwordForm.values) => {
    setChangingPassword(true);
    setPasswordSuccess(false);
    setPasswordError(null);
    
    try {
      const { error } = await resetPassword(values.newPassword);
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess(true);
        passwordForm.reset();
      }
    } catch (error) {
      setPasswordError((error as Error).message);
    } finally {
      setChangingPassword(false);
    }
  };

  const addSymbol = () => {
    if (newSymbol.trim()) {
      const symbol = newSymbol.trim().toUpperCase();
      if (!form.values.custom_symbols.includes(symbol)) {
        form.setFieldValue('custom_symbols', [...form.values.custom_symbols, symbol]);
      }
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    form.setFieldValue(
      'custom_symbols',
      form.values.custom_symbols.filter(s => s !== symbol)
    );
  };

  const addIndicator = () => {
    if (newIndicator.trim()) {
      const indicator = newIndicator.trim();
      if (!form.values.custom_indicators.includes(indicator)) {
        form.setFieldValue('custom_indicators', [...form.values.custom_indicators, indicator]);
      }
      setNewIndicator('');
    }
  };

  const removeIndicator = (indicator: string) => {
    form.setFieldValue(
      'custom_indicators',
      form.values.custom_indicators.filter(i => i !== indicator)
    );
  };

  const addStrategy = () => {
    if (newStrategy.trim()) {
      const strategy = newStrategy.trim();
      if (!form.values.custom_strategies.includes(strategy)) {
        form.setFieldValue('custom_strategies', [...form.values.custom_strategies, strategy]);
      }
      setNewStrategy('');
    }
  };

  const removeStrategy = (strategy: string) => {
    form.setFieldValue(
      'custom_strategies',
      form.values.custom_strategies.filter(s => s !== strategy)
    );
  };

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 60px)' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">Settings</Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List mb="md">
          <Tabs.Tab value="general">General</Tabs.Tab>
          <Tabs.Tab value="symbols">Symbols & Assets</Tabs.Tab>
          <Tabs.Tab value="indicators">Indicators</Tabs.Tab>
          <Tabs.Tab value="strategies">Strategies</Tabs.Tab>
          <Tabs.Tab value="security">Security</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general">
          <form onSubmit={form.onSubmit(handleSaveSettings)}>
            <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
              <Title order={3} mb="md">General Settings</Title>
              
              <Stack>
                <Group>
                  <Switch
                    label="Enable Registration"
                    description="Allow new users to register (admin only)"
                    checked={form.values.enable_registration}
                    onChange={(event) => form.setFieldValue('enable_registration', event.currentTarget.checked)}
                  />
                </Group>
                
                <Alert icon={<IconInfoCircle size={16} />} color="blue">
                  Note: Disabling registration will prevent new users from creating accounts, but won't affect existing users.
                </Alert>
              </Stack>
              
              <Group justify="right" mt="xl">
                <Button type="submit" loading={saving}>
                  Save Settings
                </Button>
              </Group>
            </Card>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="symbols">
          <form onSubmit={form.onSubmit(handleSaveSettings)}>
            <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
              <Title order={3} mb="md">Symbols & Asset Classes</Title>
              
              <Tabs value={selectedAssetClass} onChange={setSelectedAssetClass as (value: string | null) => void}>
                <Tabs.List mb="md">
                  <Tabs.Tab value="forex">Forex</Tabs.Tab>
                  <Tabs.Tab value="crypto">Crypto</Tabs.Tab>
                  <Tabs.Tab value="stocks">Stocks</Tabs.Tab>
                  <Tabs.Tab value="custom">Custom Symbols</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="forex">
                  <Stack>
                    <Text fw={500}>Default Forex Pairs</Text>
                    <MultiSelect
                      data={[
                        { value: 'EUR/USD', label: 'EUR/USD' },
                        { value: 'GBP/USD', label: 'GBP/USD' },
                        { value: 'USD/JPY', label: 'USD/JPY' },
                        { value: 'AUD/USD', label: 'AUD/USD' },
                        { value: 'USD/CAD', label: 'USD/CAD' },
                        { value: 'NZD/USD', label: 'NZD/USD' },
                        { value: 'USD/CHF', label: 'USD/CHF' },
                        { value: 'EUR/GBP', label: 'EUR/GBP' },
                        { value: 'EUR/JPY', label: 'EUR/JPY' },
                        { value: 'GBP/JPY', label: 'GBP/JPY' }
                      ]}
                      placeholder="Select forex pairs"
                      searchable
                      value={form.values.default_asset_classes.forex}
                      onChange={(value) => form.setFieldValue('default_asset_classes.forex', value)}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="crypto">
                  <Stack>
                    <Text fw={500}>Default Crypto Pairs</Text>
                    <MultiSelect
                      data={[
                        { value: 'BTC/USD', label: 'BTC/USD' },
                        { value: 'ETH/USD', label: 'ETH/USD' },
                        { value: 'XRP/USD', label: 'XRP/USD' },
                        { value: 'LTC/USD', label: 'LTC/USD' },
                        { value: 'BCH/USD', label: 'BCH/USD' },
                        { value: 'BNB/USD', label: 'BNB/USD' },
                        { value: 'ADA/USD', label: 'ADA/USD' },
                        { value: 'DOT/USD', label: 'DOT/USD' },
                        { value: 'LINK/USD', label: 'LINK/USD' },
                        { value: 'XLM/USD', label: 'XLM/USD' }
                      ]}
                      placeholder="Select crypto pairs"
                      searchable
                      value={form.values.default_asset_classes.crypto}
                      onChange={(value) => form.setFieldValue('default_asset_classes.crypto', value)}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="stocks">
                  <Stack>
<Text fw={500}>Default Stock Symbols</Text>
                    <MultiSelect
                      data={[
                        { value: 'AAPL', label: 'AAPL - Apple Inc.' },
                        { value: 'MSFT', label: 'MSFT - Microsoft Corp.' },
                        { value: 'AMZN', label: 'AMZN - Amazon.com Inc.' },
                        { value: 'GOOGL', label: 'GOOGL - Alphabet Inc.' },
                        { value: 'META', label: 'META - Meta Platforms Inc.' },
                        { value: 'TSLA', label: 'TSLA - Tesla Inc.' },
                        { value: 'NVDA', label: 'NVDA - NVIDIA Corp.' },
                        { value: 'JPM', label: 'JPM - JPMorgan Chase & Co.' },
                        { value: 'V', label: 'V - Visa Inc.' },
                        { value: 'JNJ', label: 'JNJ - Johnson & Johnson' }
                      ]}
                      placeholder="Select stock symbols"
                      searchable
                      value={form.values.default_asset_classes.stocks}
                      onChange={(value) => form.setFieldValue('default_asset_classes.stocks', value)}
                    />
                  </Stack>
                </Tabs.Panel>

                <Tabs.Panel value="custom">
                  <Stack>
                    <Text fw={500}>Custom Symbols</Text>
                    <Group>
                      <TextInput
                        placeholder="Add custom symbol"
                        value={newSymbol}
                        onChange={(e) => setNewSymbol(e.target.value)}
                        style={{ flexGrow: 1 }}
                      />
                      <Button onClick={addSymbol} leftSection={<IconPlus size={16} />}>
                        Add
                      </Button>
                    </Group>
                    
                    <Box>
                      {form.values.custom_symbols.length === 0 ? (
                        <Text c="dimmed" size="sm">No custom symbols added yet.</Text>
                      ) : (
                        <Group mt="xs">
                          {form.values.custom_symbols.map((symbol) => (
                            <Button 
                              key={symbol}
                              variant="outline"
                              rightSection={
                                <ActionIcon size="xs" color="red" onClick={() => removeSymbol(symbol)}>
                                  <IconTrash size={14} />
                                </ActionIcon>
                              }
                            >
                              {symbol}
                            </Button>
                          ))}
                        </Group>
                      )}
                    </Box>
                  </Stack>
                </Tabs.Panel>
              </Tabs>
              
              <Group justify="right" mt="xl">
                <Button type="submit" loading={saving}>
                  Save Settings
                </Button>
              </Group>
            </Card>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="indicators">
          <form onSubmit={form.onSubmit(handleSaveSettings)}>
            <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
              <Title order={3} mb="md">Technical Indicators</Title>
              
              <Stack>
                <Text fw={500}>Default Indicators</Text>
                <MultiSelect
                  data={[
                    { value: 'RSI', label: 'RSI (Relative Strength Index)' },
                    { value: 'MACD', label: 'MACD (Moving Average Convergence Divergence)' },
                    { value: 'Moving Average', label: 'Moving Average' },
                    { value: 'Bollinger Bands', label: 'Bollinger Bands' },
                    { value: 'Fibonacci', label: 'Fibonacci Retracement' },
                    { value: 'Stochastic', label: 'Stochastic Oscillator' },
                    { value: 'Support/Resistance', label: 'Support/Resistance Levels' },
                    { value: 'Trend Lines', label: 'Trend Lines' },
                    { value: 'Volume', label: 'Volume' },
                    { value: 'ATR', label: 'ATR (Average True Range)' }
                  ]}
                  placeholder="Select default indicators"
                  searchable
                  value={form.values.default_indicators}
                  onChange={(value) => form.setFieldValue('default_indicators', value)}
                />
                
                <Divider my="md" label="Custom Indicators" labelPosition="center" />
                
                <Group>
                  <TextInput
                    placeholder="Add custom indicator"
                    value={newIndicator}
                    onChange={(e) => setNewIndicator(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <Button onClick={addIndicator} leftSection={<IconPlus size={16} />}>
                    Add
                  </Button>
                </Group>
                
                <Box>
                  {form.values.custom_indicators.length === 0 ? (
                    <Text c="dimmed" size="sm">No custom indicators added yet.</Text>
                  ) : (
                    <Group mt="xs">
                      {form.values.custom_indicators.map((indicator) => (
                        <Button 
                          key={indicator}
                          variant="outline"
                          rightSection={
                            <ActionIcon size="xs" color="red" onClick={() => removeIndicator(indicator)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          }
                          size="compact-md"
                        >
                          {indicator}
                        </Button>
                      ))}
                    </Group>
                  )}
                </Box>
              </Stack>
              
              <Group justify="right" mt="xl">
                <Button type="submit" loading={saving}>
                  Save Settings
                </Button>
              </Group>
            </Card>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="strategies">
          <form onSubmit={form.onSubmit(handleSaveSettings)}>
            <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
              <Title order={3} mb="md">Trading Strategies</Title>
              
              <Stack>
                <Text fw={500}>Default Strategies</Text>
                <MultiSelect
                  data={[
                    { value: 'swing', label: 'Swing Trading' },
                    { value: 'day', label: 'Day Trading' },
                    { value: 'position', label: 'Position Trading' },
                    { value: 'momentum', label: 'Momentum Trading' },
                    { value: 'scalp', label: 'Scalping' },
                    { value: 'breakout', label: 'Breakout Trading' },
                    { value: 'trend', label: 'Trend Following' },
                    { value: 'reversal', label: 'Reversal Trading' },
                    { value: 'mean-reversion', label: 'Mean Reversion' },
                    { value: 'news', label: 'News-Based Trading' }
                  ]}
                  placeholder="Select default strategies"
                  searchable
                  value={form.values.default_strategies || []}
                  onChange={(value) => form.setFieldValue('default_strategies', value)}
                />
                
                <Divider my="md" label="Custom Strategies" labelPosition="center" />
                
                <Group>
                  <TextInput
                    placeholder="Add custom strategy"
                    value={newStrategy}
                    onChange={(e) => setNewStrategy(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <Button onClick={addStrategy} leftSection={<IconPlus size={16} />}>
                    Add
                  </Button>
                </Group>
                
                <Box>
                  {!form.values.custom_strategies || form.values.custom_strategies.length === 0 ? (
                    <Text c="dimmed" size="sm">No custom strategies added yet.</Text>
                  ) : (
                    <Group mt="xs">
                      {form.values.custom_strategies.map((strategy) => (
                        <Button 
                          key={strategy}
                          variant="outline"
                          rightSection={
                            <ActionIcon size="xs" color="red" onClick={() => removeStrategy(strategy)}>
                              <IconTrash size={14} />
                            </ActionIcon>
                          }
                          size="compact-md"
                        >
                          {strategy}
                        </Button>
                      ))}
                    </Group>
                  )}
                </Box>
              </Stack>
              
              <Group justify="right" mt="xl">
                <Button type="submit" loading={saving}>
                  Save Settings
                </Button>
              </Group>
            </Card>
          </form>
        </Tabs.Panel>

        <Tabs.Panel value="security">
          <Card shadow="sm" p="lg" radius="md" withBorder mb="lg">
            <Title order={3} mb="md">Security Settings</Title>
            
            <form onSubmit={passwordForm.onSubmit(handleChangePassword)}>
              <Stack gap="md">
                {passwordSuccess && (
                  <Alert icon={<IconCheck size={16} />} color="green" title="Success">
                    Your password has been changed successfully.
                  </Alert>
                )}
                
                {passwordError && (
                  <Alert icon={<IconX size={16} />} color="red" title="Error">
                    {passwordError}
                  </Alert>
                )}
                
                <PasswordInput
                  required
                  label="New Password"
                  placeholder="Enter new password"
                  {...passwordForm.getInputProps('newPassword')}
                />
                
                <PasswordInput
                  required
                  label="Confirm New Password"
                  placeholder="Confirm new password"
                  {...passwordForm.getInputProps('confirmPassword')}
                />
                
                <Group justify="right" mt="md">
                  <Button type="submit" loading={changingPassword}>
                    Change Password
                  </Button>
                </Group>
              </Stack>
            </form>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}