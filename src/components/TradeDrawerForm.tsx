// src/components/TradeDrawerForm.tsx
import {
  ActionIcon,
  Accordion,
  Box,
  Button,
  Card,
  Drawer,
  Grid,
  Group,
  NumberInput,
  ScrollArea,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
  Badge
} from '@mantine/core';
import { DateInput, TimeInput } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useEffect, useState } from 'react';
import { FaPlus, FaTimes } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { Journal, UserSettings } from '../lib/types';
import { TradeScreenshots } from './TradeScreenshots';

// Define types for the enhanced trade model
interface EntryPoint {
  id: string;
  date: Date;
  time: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface ExitPoint {
  id: string;
  date: Date | null;
  time: string;
  price: number | null;
  quantity: number | null;
  notes?: string;
}

interface FeeDetails {
  entry_commission?: number;
  exit_commission?: number;
  swap_fees?: number;
  exchange_fees?: number;
  other_fees?: number;
}

interface TradeDrawerFormProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editTradeId?: number;
  journalId?: number;
}

export function TradeDrawerForm({ 
  opened, 
  onClose, 
  onSuccess, 
  editTradeId, 
  journalId 
}: TradeDrawerFormProps) {
  const { 
    addTrade, 
    updateTrade, 
    getJournals, 
    getUserSettings, 
    getTradeIndicators, 
    addTradeIndicator,
    deleteTradeIndicator,
    getTrade,
    getTradeScreenshots,
    uploadTradeScreenshot
  } = useSupabase();
  
  const [journals, setJournals] = useState<Journal[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([
    { id: '1', date: new Date(), time: '09:30', price: 0, quantity: 0 }
  ]);
  const [exitPoints, setExitPoints] = useState<ExitPoint[]>([
    { 
      id: '1', 
      date: new Date(), 
      time: '16:00', 
      price: null, 
      quantity: null, 
      notes: ''
    }
  ]);
  const [screenshots, setScreenshots] = useState<{
    id?: string;
    url: string;
    file?: File;
    tradeId: number;
    fileName: string;
  }[]>([]);
  const [feeDetails, setFeeDetails] = useState<FeeDetails>({
    entry_commission: 0,
    exit_commission: 0,
    swap_fees: 0,
    exchange_fees: 0,
    other_fees: 0
  });
  
  // Main form for basic trade information
  const form = useForm({
    initialValues: {
      symbol: '',
      direction: 'long',
      strategy: 'day',
      status: 'open',
      journal_id: journalId || null,
      asset_class: 'forex',
      tags: '',
      notes: '',
      fees: 0,
      fee_type: 'fixed',
    },
    validate: {
      symbol: (value) => (value ? null : 'Symbol is required'),
    },
  });

  useEffect(() => {
    if (opened) {
      fetchData();
    }
  }, [editTradeId, opened]);

  const fetchData = async () => {
    try {
      const [journalsData, settingsData] = await Promise.all([
        getJournals(),
        getUserSettings()
      ]);
      
      setJournals(journalsData);
      setUserSettings(settingsData);
      
      if (editTradeId) {
        // Fetch existing trade
        const tradeData = await getTrade(editTradeId);
        if (tradeData) {
          // Set form values from main trade data
          form.setValues({
            symbol: tradeData.symbol,
            direction: tradeData.direction,
            strategy: tradeData.strategy || '',
            status: tradeData.status,
            journal_id: tradeData.journal_id || null,
            asset_class: determineAssetClass(tradeData.symbol, settingsData),
            tags: tradeData.tags ? tradeData.tags.join(', ') : '',
            notes: tradeData.notes || '',
            fees: tradeData.fees || 0,
            fee_type: tradeData.fee_type || 'fixed',
          });
          
          // Set fee details if available
          if (tradeData.fee_details) {
            setFeeDetails(tradeData.fee_details);
          }
          
          // Load the entry points
          if (tradeData.entries && tradeData.entries.length > 0) {
            setEntryPoints(tradeData.entries.map((entry: any) => {
              const entryDate = new Date(entry.date);
              return {
                id: entry.id || String(Math.random()),
                date: entryDate,
                time: entryDate.toTimeString().slice(0, 5),
                price: entry.price,
                quantity: entry.quantity,
                notes: entry.notes || ''
              };
            }));
          }
          
          // Load the exit points
          if (tradeData.exits && tradeData.exits.length > 0) {
            setExitPoints(tradeData.exits.map((exit: any) => {
              const exitDate = exit.date ? new Date(exit.date) : null;
              return {
                id: exit.id || String(Math.random()),
                date: exitDate,
                time: exitDate ? exitDate.toTimeString().slice(0, 5) : '16:00',
                price: exit.price,
                quantity: exit.quantity,
                notes: exit.notes || ''
              };
            }));
          }
          
          // Fetch indicators
          const indicators = await getTradeIndicators(editTradeId);
          setSelectedIndicators(indicators.map(ind => ind.indicator_name));
          
          // Fetch screenshots
          const screenshotsData = await getTradeScreenshots(editTradeId);
          const formattedScreenshots = screenshotsData.map(s => ({
            id: s.id,
            url: s.url,
            tradeId: s.trade_id,
            fileName: s.file_name
          }));
          setScreenshots(formattedScreenshots);
        }
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
    
    return symbols.map(symbol => ({ value: symbol, label: symbol }));
  };

  const getStrategyOptions = (): { value: string, label: string }[] => {
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
      return fallbackStrategies;
    }
    
    // Extract strategies from settings
    const defaultStrategies = Array.isArray(userSettings.default_strategies) 
      ? userSettings.default_strategies : [];
    
    const customStrategies = Array.isArray(userSettings.custom_strategies) 
      ? userSettings.custom_strategies : [];
    
    // Combine all strategies
    const allStrategies = [...defaultStrategies, ...customStrategies];
    
    // If empty, use fallback
    if (allStrategies.length === 0) {
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

  // Add a new entry point
  const addEntryPoint = () => {
    const newId = String(Math.random());
    setEntryPoints([
      ...entryPoints,
      { id: newId, date: new Date(), time: '09:30', price: 0, quantity: 0 }
    ]);
  };

  // Remove an entry point
  const removeEntryPoint = (id: string) => {
    if (entryPoints.length > 1) {
      setEntryPoints(entryPoints.filter(entry => entry.id !== id));
    }
  };

  // Add a new exit point
  const addExitPoint = () => {
    const newId = String(Math.random());
    // Use the entry date as the default exit date
    const defaultDate = entryPoints[0]?.date || new Date();
    
    setExitPoints([
      ...exitPoints,
      { 
        id: newId, 
        date: defaultDate, 
        time: '16:00', 
        price: null, 
        quantity: null, 
        notes: ''
      }
    ]);
  };

  // Remove an exit point
  const removeExitPoint = (id: string) => {
    if (exitPoints.length > 1) {
      setExitPoints(exitPoints.filter(exit => exit.id !== id));
    }
  };

  // Update entry point
  const updateEntryPoint = (id: string, field: keyof EntryPoint, value: any) => {
    setEntryPoints(entryPoints.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        
        // If we're updating the date and this is the first entry point,
        // also update the exit date for all exit points
        if (field === 'date' && id === entryPoints[0].id) {
          setExitPoints(exitPoints.map(exit => ({
            ...exit,
            date: value
          })));
        }
        
        return updatedEntry;
      }
      return entry;
    }));
  };

  // Update exit point
  const updateExitPoint = (id: string, field: keyof ExitPoint, value: any) => {
    setExitPoints(exitPoints.map(exit => 
      exit.id === id ? { ...exit, [field]: value } : exit
    ));
  };

  // Update fee details
  const updateFeeDetails = (field: keyof FeeDetails, value: number | undefined) => {
    setFeeDetails(prev => {
      const newDetails = { ...prev, [field]: value };
      
      // Calculate total fees and update form
      const totalFees = 
        (newDetails.entry_commission || 0) +
        (newDetails.exit_commission || 0) +
        (newDetails.swap_fees || 0) +
        (newDetails.exchange_fees || 0) +
        (newDetails.other_fees || 0);
      
      form.setFieldValue('fees', totalFees);
      
      return newDetails;
    });
  };

  // Calculate total entry and exit quantities
  const calculateTotals = () => {
    const totalEntryQuantity = entryPoints.reduce((sum, entry) => sum + entry.quantity, 0);
    const totalExitQuantity = exitPoints
      .reduce((sum, exit) => sum + (exit.quantity || 0), 0);
    
    const totalEntryValue = entryPoints.reduce((sum, entry) => sum + (entry.price * entry.quantity), 0);
    const totalExitValue = exitPoints
      .reduce((sum, exit) => sum + ((exit.price || 0) * (exit.quantity || 0)), 0);
    
    const averageEntryPrice = totalEntryQuantity === 0 ? 0 : totalEntryValue / totalEntryQuantity;
    const averageExitPrice = totalExitQuantity === 0 ? 0 : totalExitValue / totalExitQuantity;
    
    let profitLoss = 0;
    if (form.values.direction === 'long') {
      profitLoss = totalExitValue - totalEntryValue;
    } else {
      profitLoss = totalEntryValue - totalExitValue;
    }
    
    // Subtract fees from profit/loss
    const netProfitLoss = profitLoss - (form.values.fees || 0);
    
    const profitLossPercent = totalEntryValue === 0 ? 0 : (netProfitLoss / totalEntryValue) * 100;
    
    return {
      totalEntryQuantity,
      totalExitQuantity,
      averageEntryPrice,
      averageExitPrice,
      profitLoss,
      netProfitLoss,
      profitLossPercent,
      remainingQuantity: totalEntryQuantity - totalExitQuantity
    };
  };

  const validateForm = () => {
  // Basic validation
  if (!form.values.symbol) {
    return "Symbol is required";
  }
  
  // For planned trades, only require basic information
  if (form.values.status === 'planned') {
    // At minimum, require symbol, direction, and entry price plan
    if (entryPoints.length === 0) {
      return "At least one planned entry point is required";
    }
    
    // Allow zero or minimal quantity for planned trades
    // Only validate price for planned trades
    for (const entry of entryPoints) {
      if (!entry.date) return "Entry date is required";
      if (!entry.price || entry.price <= 0) return "Entry price must be greater than 0";
    }
    
    // Exit validation is optional for planned trades
    return null;
  }
  
  // Normal validation for other statuses
  
  // Validate entry points
  if (entryPoints.length === 0) {
    return "At least one entry point is required";
  }
  
  for (const entry of entryPoints) {
    if (!entry.date) return "Entry date is required";
    if (!entry.price || entry.price <= 0) return "Entry price must be greater than 0";
    if (!entry.quantity || entry.quantity <= 0) return "Entry quantity must be greater than 0";
  }
  
  // Validate exit points if status is closed
  if (form.values.status === 'closed') {
    if (exitPoints.length === 0) {
      return "For closed trades, at least one exit point is required";
    }
    
    for (const exit of exitPoints) {
      if (!exit.date) return "Exit date is required for exits";
      if (!exit.price || exit.price <= 0) return "Exit price must be greater than 0 for exits";
      if (!exit.quantity || exit.quantity <= 0) return "Exit quantity must be greater than 0 for exits";
    }
    
    // Check that all entries are accounted for
    const { totalEntryQuantity, totalExitQuantity } = calculateTotals();
    if (totalExitQuantity < totalEntryQuantity) {
      return "Total exit quantity must equal total entry quantity for closed trades";
    }
  }
  
  return null;
};

  // Helper function to combine date and time
  const combineDateAndTime = (date: Date, timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = new Date(date);
    newDate.setHours(hours || 0);
    newDate.setMinutes(minutes || 0);
    return newDate;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      alert(validationError);
      return;
    }
    
    setLoading(true);
    
    try {
      // Calculate trade statistics
      const calculations = calculateTotals();
      
      // Prepare main trade object
      const tradeData = {
        symbol: form.values.symbol.toUpperCase(),
        direction: form.values.direction,
        strategy: form.values.strategy || undefined,
        status: form.values.status,
        tags: form.values.tags ? form.values.tags.split(',').map(tag => tag.trim()) : undefined,
        notes: form.values.notes || undefined,
        journal_id: form.values.journal_id || undefined,
        
        // Main entry and exit data (for compatibility)
        entry_date: combineDateAndTime(entryPoints[0].date, entryPoints[0].time).toISOString(),
        entry_price: calculations.averageEntryPrice,
        exit_date: form.values.status === 'closed' && exitPoints[0].date
          ? combineDateAndTime(exitPoints[0].date, exitPoints[0].time).toISOString() 
          : undefined,
        exit_price: calculations.averageExitPrice || undefined,
        quantity: calculations.totalEntryQuantity,
        
        // Fee information
        fees: form.values.fees || 0,
        fee_type: form.values.fee_type || 'fixed',
        fee_details: feeDetails,
        
        // Calculated P/L (net of fees)
        profit_loss: form.values.status === 'closed' ? calculations.netProfitLoss : undefined,
        profit_loss_percent: form.values.status === 'closed' ? calculations.profitLossPercent : undefined,
        
        // Detailed entry and exit points
        entries: entryPoints.map(entry => ({
          date: combineDateAndTime(entry.date, entry.time).toISOString(),
          price: entry.price,
          quantity: entry.quantity,
          notes: entry.notes || undefined
        })),
        
        exits: exitPoints.map(exit => ({
          date: exit.date ? combineDateAndTime(exit.date, exit.time).toISOString() : undefined,
          price: exit.price,
          quantity: exit.quantity,
          notes: exit.notes || undefined
        }))
      };
      
      let savedTradeId: number;

      // Save/update the trade
      if (editTradeId) {
        await updateTrade(editTradeId, tradeData);
        savedTradeId = editTradeId;
        
        // Update indicators
        const existingIndicators = await getTradeIndicators(editTradeId);
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
              trade_id: editTradeId,
              indicator_name: indicator
            });
          }
        }
      } else {
        const newTrade = await addTrade(tradeData);
        
        if (newTrade) {
          savedTradeId = newTrade.id;
          
          // Add indicators
          for (const indicator of selectedIndicators) {
            await addTradeIndicator({
              trade_id: newTrade.id,
              indicator_name: indicator
            });
          }

          // Upload screenshots for new trade (if any)
          for (const screenshot of screenshots) {
            if (screenshot.file) {
              await uploadTradeScreenshot(newTrade.id, screenshot.file);
            }
          }
        } else {
          throw new Error("Failed to create new trade");
        }
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('Error saving trade. Please try again.');
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

  // Format a monetary value for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Handle screenshot changes
  const handleScreenshotsChange = (updatedScreenshots: any[]) => {
    setScreenshots(updatedScreenshots);
  };

  // Set status to closed if there are exit details
  useEffect(() => {
    // Auto-change status when exit details are added
    const hasExitDetails = exitPoints.some(exit => 
      exit.price && exit.price > 0 && 
      exit.quantity && exit.quantity > 0
    );
    
    if (hasExitDetails && form.values.status === 'open') {
      form.setFieldValue('status', 'closed');
    }
  }, [exitPoints]);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      title={editTradeId ? 'Edit Trade' : 'Add New Trade'}
      position="right"
      size="xl"
      padding="md"
    >
      <ScrollArea h="calc(100vh - 120px)" offsetScrollbars>
        <Stack gap="md">
          {/* Basic Trade Information */}
          <Card shadow="sm" p="md" withBorder>
            <Title order={4} mb="md">Trade Information</Title>
            
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

            <Group grow mt="md">
              <Select
                required
                label="Symbol"
                placeholder="AAPL"
                data={getAvailableSymbols()}
                searchable
                creatable
                getCreateLabel={(query) => `+ Add ${query}`}
                onCreate={(query) => {
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

            <Group grow mt="md">
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
                  return strategy;
                }}
                {...form.getInputProps('strategy')}
              />
              <Select
                required
                label="Trade Status"
                placeholder="Select status"
                data={[
                  { value: 'open', label: 'Open' },
                  { value: 'closed', label: 'Closed' },
                  { value: 'planned', label: 'Planned (Not Executed)' },
                ]}
                {...form.getInputProps('status')}
              />
            </Group>
          </Card>

          {/* Entry Points */}
          <Card shadow="sm" p="md" withBorder>
            <Group justify="apart" mb="md">
              <Title order={4}>Entry Points</Title>
              <Button 
                size="xs" 
                leftSection={<FaPlus size={12} />} 
                onClick={addEntryPoint}
              >
                Add Entry
              </Button>
            </Group>

            {entryPoints.map((entry, index) => (
              <Card key={entry.id} shadow="sm" p="sm" withBorder mb="md">
                <Group justify="apart" mb="xs">
                  <Text fw={500}>Entry #{index + 1}</Text>
                  {entryPoints.length > 1 && (
                    <ActionIcon 
                      color="red" 
                      variant="subtle" 
                      onClick={() => removeEntryPoint(entry.id)}
                    >
                      <FaTimes size={14} />
                    </ActionIcon>
                  )}
                </Group>
                
                <Grid>
                  <Grid.Col span={6}>
                    <DateInput
                      required
                      label="Entry Date"
                      placeholder="Pick date"
                      value={entry.date}
                      onChange={(value) => updateEntryPoint(entry.id, 'date', value || new Date())}
                      mb="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <TimeInput
                      label="Entry Time"
                      placeholder="Enter time"
                      value={entry.time}
                      onChange={(e) => updateEntryPoint(entry.id, 'time', e.target.value)}
                      mb="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      required
                      label="Entry Price"
                      placeholder="Enter price"
                      min={0}
                      precision={2}
                      value={entry.price}
                      onChange={(value) => updateEntryPoint(entry.id, 'price', value || 0)}
                      mb="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      required
                      label="Quantity"
                      placeholder="Enter quantity"
                      min={1}
                      value={entry.quantity}
                      onChange={(value) => updateEntryPoint(entry.id, 'quantity', value || 0)}
                      mb="xs"
                    />
                  </Grid.Col>
                  <Grid.Col span={12}>
                    <TextInput
                      label="Notes"
                      placeholder="Entry notes"
                      value={entry.notes || ''}
                      onChange={(e) => updateEntryPoint(entry.id, 'notes', e.target.value)}
                    />
                  </Grid.Col>
                </Grid>
              </Card>
            ))}
          </Card>
          
          {/* Exit Points - SIMPLIFIED WITHOUT STOP LOSS, TAKE PROFIT, EXECUTION STATUS */}
<Card shadow="sm" p="md" withBorder>
  <Group justify="apart" mb="md">
    <Title order={4}>Exit Points</Title>
    <Button 
      size="xs" 
      leftSection={<FaPlus size={12} />} 
      onClick={addExitPoint}
    >
      Add Exit
    </Button>
  </Group>

  {exitPoints.map((exit, index) => (
    <Card key={exit.id} shadow="sm" p="sm" withBorder mb="md">
      <Group justify="apart" mb="xs">
        <Group>
          <Text fw={500}>Exit #{index + 1}</Text>
        </Group>
        {exitPoints.length > 1 && (
          <ActionIcon 
            color="red" 
            variant="subtle" 
            onClick={() => removeExitPoint(exit.id)}
          >
            <FaTimes size={14} />
          </ActionIcon>
        )}
      </Group>
      
      <Grid>
        <Grid.Col span={6}>
          <DateInput
            label="Exit Date"
            placeholder="Pick date"
            value={exit.date}
            onChange={(value) => updateExitPoint(exit.id, 'date', value)}
            mb="xs"
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <TimeInput
            label="Exit Time"
            placeholder="Enter time"
            value={exit.time}
            onChange={(e) => updateExitPoint(exit.id, 'time', e.target.value)}
            mb="xs"
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Exit Price"
            placeholder="Enter price"
            min={0}
            precision={2}
            value={exit.price || undefined}
            onChange={(value) => updateExitPoint(exit.id, 'price', value)}
            mb="xs"
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <NumberInput
            label="Quantity"
            placeholder="Enter quantity"
            min={1}
            value={exit.quantity || undefined}
            onChange={(value) => updateExitPoint(exit.id, 'quantity', value)}
            mb="xs"
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <TextInput
            label="Notes"
            placeholder="Exit notes"
            value={exit.notes || ''}
            onChange={(e) => updateExitPoint(exit.id, 'notes', e.target.value)}
          />
        </Grid.Col>
      </Grid>
    </Card>
  ))}
</Card>

{/* Fees & Commissions */}
<Card shadow="sm" p="md" withBorder>
  <Title order={4} mb="md">Fees & Commissions</Title>
  
  <Grid>
    <Grid.Col span={6}>
      <NumberInput
        label="Total Fees"
        description="Combined fees for this trade"
        placeholder="0.00"
        min={0}
        precision={2}
        value={form.values.fees || 0}
        onChange={(value) => form.setFieldValue('fees', value)}
        mb="md"
      />
    </Grid.Col>
    
    <Grid.Col span={6}>
      <Select
        label="Fee Type"
        placeholder="Select fee type"
        data={[
          { value: 'percentage', label: 'Percentage of Trade Value' },
          { value: 'fixed', label: 'Fixed Amount' },
        ]}
        value={form.values.fee_type || 'fixed'}
        onChange={(value) => form.setFieldValue('fee_type', value)}
        mb="md"
      />
    </Grid.Col>
  </Grid>
  
  <Accordion>
    <Accordion.Item value="detailedFees">
      <Accordion.Control>
        <Text fw={500}>Detailed Fee Breakdown</Text>
      </Accordion.Control>
      <Accordion.Panel>
        <Grid>
          <Grid.Col span={6}>
            <NumberInput
              label="Entry Commission"
              placeholder="0.00"
              min={0}
              precision={2}
              value={feeDetails.entry_commission || 0}
              onChange={(value) => updateFeeDetails('entry_commission', value)}
              mb="xs"
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Exit Commission"
              placeholder="0.00"
              min={0}
              precision={2}
              value={feeDetails.exit_commission || 0}
              onChange={(value) => updateFeeDetails('exit_commission', value)}
              mb="xs"
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Swap/Overnight Fees"
              placeholder="0.00"
              min={0}
              precision={2}
              value={feeDetails.swap_fees || 0}
              onChange={(value) => updateFeeDetails('swap_fees', value)}
              mb="xs"
            />
          </Grid.Col>
          <Grid.Col span={6}>
            <NumberInput
              label="Exchange Fees"
              placeholder="0.00"
              min={0}
              precision={2}
              value={feeDetails.exchange_fees || 0}
              onChange={(value) => updateFeeDetails('exchange_fees', value)}
              mb="xs"
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <NumberInput
              label="Other Fees"
              placeholder="0.00"
              min={0}
              precision={2}
              value={feeDetails.other_fees || 0}
              onChange={(value) => updateFeeDetails('other_fees', value)}
              mb="xs"
            />
          </Grid.Col>
        </Grid>
      </Accordion.Panel>
    </Accordion.Item>
  </Accordion>
</Card>
          
{/* Technical Indicators */}
<Card shadow="sm" p="md" withBorder>
  <Title order={4} mb="md">Technical Indicators</Title>
  
  <Box>
    <Text size="sm" fw={500} mb="xs">Indicators Used</Text>
    <Group>
      {getIndicatorOptions().map(indicator => (
        <Badge
          key={indicator.value}
          onClick={() => handleIndicatorToggle(indicator.value)}
          style={{ cursor: 'pointer' }}
          color={selectedIndicators.includes(indicator.value) ? 'blue' : 'gray'}
        >
          {indicator.label}
        </Badge>
      ))}
    </Group>
  </Box>
</Card>

{/* Additional Details */}
<Card shadow="sm" p="md" withBorder>
  <Title order={4} mb="md">Additional Details</Title>
  
  <TextInput
    label="Tags"
    placeholder="earnings, breakout, reversal"
    description="Separate tags with commas"
    mb="md"
    {...form.getInputProps('tags')}
  />

  <Textarea
    label="Trade Notes"
    placeholder="Add your trade notes here..."
    minRows={4}
    {...form.getInputProps('notes')}
  />
</Card>

{/* Screenshots Section - Now available for both new and existing trades */}
<Card shadow="sm" p="md" withBorder>
  <Title order={4} mb="md">Screenshots</Title>
  
  <TradeScreenshots
    tradeId={editTradeId || 0}
    screenshots={screenshots}
    onScreenshotsChange={handleScreenshotsChange}
  />
</Card>

{/* Trade Calculations */}
<Card shadow="sm" p="md" withBorder>
  <Title order={4} mb="md">Trade Calculations</Title>
  
  {(() => {
    const calculations = calculateTotals();
    return (
      <Box>
        <Grid>
          <Grid.Col span={6}>
            <Text fw={500}>Total Entry Quantity:</Text>
            <Text mb="md">{calculations.totalEntryQuantity}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={500}>Average Entry Price:</Text>
            <Text mb="md">{formatCurrency(calculations.averageEntryPrice)}</Text>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500}>Total Exit Quantity:</Text>
            <Text mb="md">{calculations.totalExitQuantity}</Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={500}>Average Exit Price:</Text>
            <Text mb="md">{calculations.averageExitPrice ? formatCurrency(calculations.averageExitPrice) : 'N/A'}</Text>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500}>Remaining Quantity:</Text>
            <Text mb="md" fw={calculations.remainingQuantity > 0 ? 700 : 400}>
              {calculations.remainingQuantity}
            </Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={500}>Gross Profit/Loss:</Text>
            <Text 
              mb="md"
              fw={700} 
              c={calculations.profitLoss > 0 ? 'green' : calculations.profitLoss < 0 ? 'red' : undefined}
            >
              {formatCurrency(calculations.profitLoss)}
            </Text>
          </Grid.Col>
          
          <Grid.Col span={6}>
            <Text fw={500}>Fees:</Text>
            <Text mb="md" c="red">
              {formatCurrency(form.values.fees || 0)}
            </Text>
          </Grid.Col>
          <Grid.Col span={6}>
            <Text fw={500}>Net Profit/Loss:</Text>
            <Text 
              mb="md"
              fw={700} 
              c={calculations.netProfitLoss > 0 ? 'green' : calculations.netProfitLoss < 0 ? 'red' : undefined}
            >
              {formatCurrency(calculations.netProfitLoss)} ({calculations.profitLossPercent.toFixed(2)}%)
            </Text>
          </Grid.Col>
        </Grid>
      </Box>
    );
  })()}
</Card>
</Stack>
  </ScrollArea>

  {/* Footer buttons */}
  <Group justify="right" mt="lg" px="md">
    <Button variant="outline" onClick={onClose}>
      Cancel
    </Button>
    <Button onClick={handleSubmit} loading={loading}>
      {editTradeId ? 'Update Trade' : 'Add Trade'}
    </Button>
  </Group>
</Drawer>
  );
}