// src/components/TradeForm.tsx
import { useState, useEffect } from 'react';
import {
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  Textarea,
  Paper,
  Box,
  Title,
  Switch,
  ActionIcon,
  Tooltip,
  Text,
  Divider,
  MultiSelect,
  Checkbox
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade, NewTrade } from '../lib/supabase';
import { Journal, UserSettings } from '../lib/types';
import { FaTimes } from 'react-icons/fa';
import { TradeScreenshots, Screenshot } from './TradeScreenshots';

interface TradeFormProps {
  editTrade?: Trade;
  onSuccess: () => void;
  onCancel: () => void;
  journalId?: number;
}

export function TradeForm({ editTrade, onSuccess, onCancel, journalId }: TradeFormProps) {
  const { 
    addTrade, 
    updateTrade, 
    getJournals, 
    getUserSettings, 
    getTradeIndicators, 
    addTradeIndicator, 
    deleteTradeIndicator,
    getTradeScreenshots
  } = useSupabase();
  
  const [journals, setJournals] = useState<Journal[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      symbol: '',
      entry_date: new Date(),
      exit_date: null as Date | null,
      entry_price: 0,
      exit_price: null as number | null,
      quantity: 0,
      direction: 'long' as 'long' | 'short',
      status: 'open' as 'open' | 'closed',
      strategy: '',
      notes: '',
      tags: '',
      journal_id: journalId || null as number | null,
      asset_class: 'stocks' as string,
    },
    validate: {
      symbol: (value) => (value ? null : 'Symbol is required'),
      entry_date: (value) => (value ? null : 'Entry date is required'),
      entry_price: (value) => (value > 0 ? null : 'Entry price must be greater than 0'),
      quantity: (value) => (value > 0 ? null : 'Quantity must be greater than 0'),
      exit_price: (value, values) =>
        values.status === 'closed' && !value ? 'Exit price is required for closed trades' : null,
      exit_date: (value, values) =>
        values.status === 'closed' && !value ? 'Exit date is required for closed trades' : null,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [journalsData, settingsData] = await Promise.all([
        getJournals(),
        getUserSettings()
      ]);
      
      console.log("Fetched user settings:", settingsData);
      
      setJournals(journalsData);
      setUserSettings(settingsData);
      
      if (editTrade) {
        // Parse dates from strings to Date objects
        const entryDate = new Date(editTrade.entry_date);
        const exitDate = editTrade.exit_date ? new Date(editTrade.exit_date) : null;
        
        // Determine asset class for the trade
        const assetClass = determineAssetClass(editTrade.symbol, settingsData);
        
        form.setValues({
          symbol: editTrade.symbol,
          entry_date: entryDate,
          exit_date: exitDate,
          entry_price: editTrade.entry_price,
          exit_price: editTrade.exit_price || null,
          quantity: editTrade.quantity,
          direction: editTrade.direction,
          status: editTrade.status,
          strategy: editTrade.strategy || '',
          notes: editTrade.notes || '',
          tags: editTrade.tags ? editTrade.tags.join(', ') : '',
          journal_id: editTrade.journal_id || null,
          asset_class: assetClass,
        });
        
        // Fetch indicators if editing
        const indicators = await getTradeIndicators(editTrade.id);
        setSelectedIndicators(indicators.map(ind => ind.indicator_name));
        
        // Fetch screenshots if editing
        const screenshotsData = await getTradeScreenshots(editTrade.id);
        const formattedScreenshots: Screenshot[] = screenshotsData.map(s => ({
          id: s.id,
          url: s.url,
          tradeId: s.trade_id,
          fileName: s.file_name,
        }));
        setScreenshots(formattedScreenshots);
      } else if (journalId) {
        // If creating a new trade with a preselected journal
        form.setFieldValue('journal_id', journalId);
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const determineAssetClass = (symbol: string, settings: UserSettings | null): string => {
    if (!settings) return 'stocks';
    
    // Check in all asset classes
    for (const [assetClass, symbols] of Object.entries(settings.default_asset_classes)) {
      if (symbols.includes(symbol)) {
        return assetClass;
      }
    }
    
    // Check if it's a custom symbol
    if (settings.custom_symbols?.includes(symbol)) {
      return 'custom';
    }
    
    // Make educated guesses based on symbol format
    if (symbol.includes('/')) {
      // Symbols with slashes are typically forex or crypto
      return symbol.includes('BTC') || symbol.includes('ETH') || 
             symbol.includes('XRP') || symbol.includes('LTC') ? 'crypto' : 'forex';
    }
    
    // Default to stocks
    return 'stocks';
  };

  const getAvailableSymbols = (): { value: string, label: string }[] => {
    if (!userSettings) return [];
    
    const assetClass = form.values.asset_class;
    let symbols: string[] = [];
    
    // Get default symbols for selected asset class
    if (assetClass in userSettings.default_asset_classes) {
      symbols = userSettings.default_asset_classes[assetClass];
    }
    
    // Add custom symbols for "custom" asset class
    if (assetClass === 'custom' && userSettings.custom_symbols) {
      symbols = [...userSettings.custom_symbols];
    }
    // For other asset classes, don't include custom symbols in dropdown
    
    return symbols.map(symbol => ({ value: symbol, label: symbol }));
  };

  const getStrategyOptions = (): { value: string, label: string }[] => {
    console.log("UserSettings for strategies:", {
      defaultStrategies: userSettings?.default_strategies,
      customStrategies: userSettings?.custom_strategies
    });
    
    // Default fallback strategies
    const fallbackStrategies = [
      { value: 'swing', label: 'Swing Trading' },
      { value: 'day', label: 'Day Trading' },
      { value: 'position', label: 'Position Trading' },
      { value: 'momentum', label: 'Momentum Trading' },
      { value: 'scalp', label: 'Scalping' },
      { value: 'breakout', label: 'Breakout Trading' },
      { value: 'other', label: 'Other' },
    ];
    
    // If no user settings, return fallback
    if (!userSettings) {
      console.log("No user settings found, using fallback strategies");
      return fallbackStrategies;
    }
    
    // Extract strategies from settings
    const defaultStrategies = Array.isArray(userSettings.default_strategies) 
      ? userSettings.default_strategies : [];
    
    const customStrategies = Array.isArray(userSettings.custom_strategies) 
      ? userSettings.custom_strategies : [];
    
    // Combine all strategies
    const allStrategies = [...defaultStrategies, ...customStrategies];
    
    console.log("Combined strategies:", allStrategies);
    
    // If empty, use fallback
    if (allStrategies.length === 0) {
      console.log("No strategies found in settings, using fallback");
      return fallbackStrategies;
    }
    
    // Return formatted strategies
    return allStrategies.map(strategy => ({ 
      value: strategy, 
      label: strategy 
    }));
  };

  const getIndicatorOptions = (): { value: string, label: string }[] => {
    if (!userSettings) return [];
    
    const defaultIndicators = userSettings.default_indicators || [];
    const customIndicators = userSettings.custom_indicators || [];
    const allIndicators = [...defaultIndicators, ...customIndicators];
    
    return allIndicators.map(indicator => ({ value: indicator, label: indicator }));
  };

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // Convert form values to trade object
      const tradeData: NewTrade & { journal_id?: number } = {
        symbol: values.symbol.toUpperCase(),
        entry_date: values.entry_date.toISOString(),
        exit_date: values.exit_date ? values.exit_date.toISOString() : undefined,
        entry_price: values.entry_price,
        exit_price: values.exit_price || undefined,
        quantity: values.quantity,
        direction: values.direction,
        status: values.status,
        strategy: values.strategy || undefined,
        notes: values.notes || undefined,
        tags: values.tags ? values.tags.split(',').map((tag) => tag.trim()) : undefined,
        journal_id: values.journal_id || undefined,
      };

      let tradeId: number;
      
      if (editTrade) {
        const updatedTrade = await updateTrade(editTrade.id, tradeData);
        tradeId = editTrade.id;
      } else {
        const newTrade = await addTrade(tradeData);
        tradeId = newTrade!.id;
      }
      
      // Handle indicators
      if (editTrade) {
        // Get existing indicators
        const existingIndicators = await getTradeIndicators(tradeId);
        const existingIndicatorNames = existingIndicators.map(ind => ind.indicator_name);
        
        // Remove indicators that are no longer selected
        for (const existingInd of existingIndicators) {
          if (!selectedIndicators.includes(existingInd.indicator_name)) {
            await deleteTradeIndicator(existingInd.id);
          }
        }
        
        // Add new indicators
        for (const indicator of selectedIndicators) {
          if (!existingIndicatorNames.includes(indicator)) {
            await addTradeIndicator({
              trade_id: tradeId,
              indicator_name: indicator
            });
          }
        }
      } else {
        // Add all selected indicators
        for (const indicator of selectedIndicators) {
          await addTradeIndicator({
            trade_id: tradeId,
            indicator_name: indicator
          });
        }
      }

      form.reset();
      setScreenshots([]);
      onSuccess();
    } catch (error) {
      console.error('Error saving trade:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleIndicatorToggle = (indicator: string) => {
    if (selectedIndicators.includes(indicator)) {
      setSelectedIndicators(prev => prev.filter(i => i !== indicator));
    } else {
      setSelectedIndicators(prev => [...prev, indicator]);
    }
  };

  return (
    <Paper p="md" shadow="xs" radius="md">
      <Group position="apart" mb="md">
        <Title order={3}>{editTrade ? 'Edit Trade' : 'Add New Trade'}</Title>
        <Tooltip label="Close">
          <ActionIcon onClick={onCancel} variant="subtle">
            <FaTimes />
          </ActionIcon>
        </Tooltip>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="md">
          <Group grow>
            <Select
              label="Journal"
              placeholder="Select journal"
              data={journals.map(journal => ({ value: String(journal.id), label: journal.name }))}
              value={form.values.journal_id ? String(form.values.journal_id) : null}
              onChange={(value) => form.setFieldValue('journal_id', value ? parseInt(value) : null)}
              clearable
            />
            <Select
              required
              label="Asset Class"
              placeholder="Select asset class"
              data={[
                { value: 'forex', label: 'Forex' },
                { value: 'crypto', label: 'Crypto' },
                { value: 'stocks', label: 'Stocks' },
                { value: 'custom', label: 'Custom' }
              ]}
              {...form.getInputProps('asset_class')}
            />
          </Group>

          <Group grow>
            <Select
              required
              label="Symbol"
              placeholder="AAPL"
              data={getAvailableSymbols()}
              searchable
              creatable
              getCreateLabel={(query) => `+ Add ${query}`}
              onCreate={(query) => {
                // If a custom symbol is created, we could add it to user settings
                return query.toUpperCase();
              }}
              {...form.getInputProps('symbol')}
            />
            <Select
              required
              label="Direction"
              placeholder="Select direction"
              data={[
                { value: 'long', label: 'Long' },
                { value: 'short', label: 'Short' },
              ]}
              {...form.getInputProps('direction')}
            />
          </Group>

          <Group grow>
            <DateInput
              required
              label="Entry Date"
              placeholder="Pick date"
              {...form.getInputProps('entry_date')}
            />
            <NumberInput
              required
              label="Entry Price"
              placeholder="100.00"
              min={0}
              precision={2}
              {...form.getInputProps('entry_price')}
            />
          </Group>

          <Group grow>
            <NumberInput
              required
              label="Quantity"
              placeholder="100"
              min={1}
              {...form.getInputProps('quantity')}
            />
            <Select
              required
              label="Strategy"
              placeholder="Select strategy"
              data={getStrategyOptions()}
              searchable
              creatable
              getCreateLabel={(query) => `+ Add "${query}" strategy`}
              onCreate={(query) => {
                const strategy = query.trim();
                // Could save to user settings here
                return strategy;
              }}
              {...form.getInputProps('strategy')}
            />
          </Group>

          <Switch
            label="Trade Closed"
            checked={form.values.status === 'closed'}
            onChange={(event) => {
              form.setFieldValue('status', event.currentTarget.checked ? 'closed' : 'open');
            }}
          />

          {form.values.status === 'closed' && (
            <Group grow>
              <DateInput
                required
                label="Exit Date"
                placeholder="Pick date"
                {...form.getInputProps('exit_date')}
              />
              <NumberInput
                required
                label="Exit Price"
                placeholder="110.00"
                min={0}
                precision={2}
                {...form.getInputProps('exit_price')}
              />
            </Group>
          )}

          <Divider label="Indicators" labelPosition="center" />
          
          <Text size="sm" fw={500}>Technical Indicators Used</Text>
          <Group>
            {getIndicatorOptions().map(indicator => (
              <Checkbox
                key={indicator.value}
                label={indicator.label}
                checked={selectedIndicators.includes(indicator.value)}
                onChange={() => handleIndicatorToggle(indicator.value)}
              />
            ))}
          </Group>

          <TextInput
            label="Tags"
            placeholder="earnings, breakout, reversal"
            {...form.getInputProps('tags')}
          />

          <Textarea
            label="Notes"
            placeholder="Add your trade notes here..."
            minRows={3}
            {...form.getInputProps('notes')}
          />
          
          <Divider label="Screenshots" labelPosition="center" />
          
          {editTrade ? (
            <TradeScreenshots
              tradeId={editTrade.id}
              screenshots={screenshots}
              onScreenshotsChange={setScreenshots}
            />
          ) : (
            <Text c="dimmed" size="sm" ta="center" py="sm">
              You can add screenshots after saving the trade.
            </Text>
          )}

          <Group position="right" mt="md">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" color="blue" loading={loading}>
              {editTrade ? 'Update Trade' : 'Add Trade'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}