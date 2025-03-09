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
  Grid, 
  Card, 
  RingProgress,
  useMantineTheme,
  Box,
  Loader,
  Center,
  Badge
} from '@mantine/core';
import { TradeList } from '../components/TradeList';
import { TradeForm } from '../components/TradeForm';
import { useSupabase, TradeStats } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Trade } from '../lib/supabase';
import { FaPlus } from 'react-icons/fa';
import { TradeStatsDisplay } from '../components/TradeStats';

export function DashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | undefined>(undefined);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { getTrades, getTradeStats } = useSupabase();
  const { selectedJournalId, selectedJournal } = useJournal();
  const theme = useMantineTheme();

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

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditTrade(undefined);
    fetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditTrade(undefined);
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
        {journalTitle}


<TradeStatsDisplay stats={stats} formatCurrency={formatCurrency} />

<Group position="apart" mt="xl">
  <Title order={2}>Trades</Title>
  <Button 
    leftIcon={<FaPlus size={14} />} 
    onClick={() => setShowForm(true)}
    disabled={showForm}
  >
    Add Trade
  </Button>
</Group>

        {showForm ? (
          <TradeForm 
            editTrade={editTrade} 
            onSuccess={handleFormSuccess} 
            onCancel={handleFormCancel}
            journalId={selectedJournalId}
          />
        ) : (
          <Paper p="md" shadow="xs" radius="md">
            <TradeList 
              onEditTrade={handleEditTrade} 
              journalId={selectedJournalId}
              onTradeUpdated={fetchData}
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}