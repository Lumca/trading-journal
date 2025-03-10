// src/pages/DashboardPage.tsx
import { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Button, 
  Group, 
  Stack, 
  Paper, 
  Text, 
  Badge,
  Loader,
  Center,
  Box,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { TradeList } from '../components/TradeList';
import { TradeView } from '../components/TradeView';
import { TradeStatsDisplay } from '../components/TradeStats';
import { useSupabase, TradeStats } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Trade } from '../lib/supabase';
import { TradeDrawerButton } from '../components/TradeDrawerButton';
import { IconRefresh } from '@tabler/icons-react';

export function DashboardPage() {
  const [viewTrade, setViewTrade] = useState<Trade | undefined>(undefined);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { getTrades, getTradeStats } = useSupabase();
  const { selectedJournalId, selectedJournal } = useJournal();

  useEffect(() => {
    fetchData();
  }, [selectedJournalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tradesData, statsData] = await Promise.all([
        getTrades(selectedJournalId),
        getTradeStats(selectedJournalId)
      ]);
      
      setTrades(tradesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTrade = (trade: Trade) => {
    setViewTrade(trade);
  };

  const handleBackFromView = () => {
    setViewTrade(undefined);
  };

  const formatCurrency = (value: number) => {
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 60px)' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  const journalTitle = selectedJournal ? (
    <Group>
      <Title order={1}>Trading Journal</Title>
      <Badge 
        color={selectedJournal.is_active ? 'green' : 'gray'} 
        size="lg" 
        variant="filled"
      >
        {selectedJournal.name}
      </Badge>
    </Group>
  ) : (
    <Title order={1}>Trading Journal</Title>
  );

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Group position="apart">
          {journalTitle}
          <Group>
            <Tooltip label="Refresh Data">
              <ActionIcon variant="light" onClick={fetchData}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <TradeDrawerButton 
              mode="add" 
              onSuccess={fetchData} 
              journalId={selectedJournalId} 
            />
          </Group>
        </Group>

        <TradeStatsDisplay stats={stats} formatCurrency={formatCurrency} />

        <Group position="apart" mt="md">
          <Title order={2}>Trades</Title>
        </Group>

        {viewTrade ? (
          <TradeView 
            trade={viewTrade}
            onBack={handleBackFromView}
            onEdit={() => {
              // The TradeDrawerButton will handle the edit functionality
              // Just keeping the view open
            }}
          />
        ) : (
          <Paper p="md" shadow="xs" radius="md">
            <TradeList 
              onViewTrade={handleViewTrade}
              journalId={selectedJournalId}
              onTradeUpdated={fetchData}
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}