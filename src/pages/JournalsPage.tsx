// src/pages/JournalsPage.tsx
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
  Badge,
  Box,
  Center,
  Loader,
  Tabs,
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { useSupabase } from '../contexts/SupabaseContext';
import { Journal, JournalStats } from '../lib/types';
import { JournalList } from '../components/JournalList';
import { JournalForm } from '../components/JournalForm';
import { TradeList } from '../components/TradeList';
import { TradeForm } from '../components/TradeForm';
import { Trade } from '../lib/supabase';
import { IconPlus, IconBook, IconList } from '@tabler/icons-react';

export function JournalsPage() {
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
  const [editJournal, setEditJournal] = useState<Journal | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'journals' | 'trades'>('journals');
  const { getJournalStats } = useSupabase();
  const [journalStats, setJournalStats] = useState<any>(null);

  useEffect(() => {
    if (selectedJournal) {
      fetchJournalStats();
    }
  }, [selectedJournal]);

  const fetchJournalStats = async () => {
    if (!selectedJournal) return;
    
    setLoading(true);
    try {
      const stats = await getJournalStats(selectedJournal.id);
      setJournalStats(stats);
    } catch (error) {
      console.error('Error fetching journal stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditJournal = (journal: Journal) => {
    setEditJournal(journal);
    setShowJournalForm(true);
  };

  const handleSelectJournal = (journal: Journal) => {
    setSelectedJournal(journal);
    setView('trades');
  };

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setShowTradeForm(true);
  };

  const handleFormSuccess = () => {
    setShowJournalForm(false);
    setShowTradeForm(false);
    setEditJournal(null);
    setEditTrade(null);
    
    // Refresh stats if in trade view
    if (view === 'trades' && selectedJournal) {
      fetchJournalStats();
    }
  };

  const handleFormCancel = () => {
    setShowJournalForm(false);
    setShowTradeForm(false);
    setEditJournal(null);
    setEditTrade(null);
  };

  const formatCurrency = (value: number) => {
    if (!selectedJournal) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedJournal.base_currency || 'USD',
    }).format(value);
  };

  return (
    <Container size="xl" py="xl">
      {view === 'journals' ? (
        <>
          <Group position="apart" mb="xl">
            <Title order={1}>Trading Journals</Title>
            <Button 
              leftIcon={<IconPlus size={16} />}
              onClick={() => setShowJournalForm(true)}
              disabled={showJournalForm}
            >
              Create Journal
            </Button>
          </Group>

          {showJournalForm ? (
            <JournalForm
              editJournal={editJournal || undefined}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          ) : (
            <Paper p="md" shadow="xs" radius="md">
              <JournalList
                onEditJournal={handleEditJournal}
                onSelectJournal={handleSelectJournal}
              />
            </Paper>
          )}
        </>
      ) : (
        <>
          <Group position="apart" mb="xl">
            <Group>
              <ActionIcon size="lg" onClick={() => setView('journals')} variant="light">
                <IconBook size={18} />
              </ActionIcon>
              <Title order={1}>
                {selectedJournal?.name}
                {' '}
                <Badge color={selectedJournal?.is_active ? 'green' : 'gray'} size="lg">
                  {selectedJournal?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Title>
            </Group>
            <Button 
              leftIcon={<IconPlus size={16} />}
              onClick={() => setShowTradeForm(true)}
              disabled={showTradeForm}
            >
              Add Trade
            </Button>
          </Group>

          {selectedJournal && (
            <>
              {loading ? (
                <Center my="xl">
                  <Loader size="lg" />
                </Center>
              ) : (
                <Grid mb="xl">
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Win Rate</Text>
                      <Text ta="center" fz="xl" fw={700} c={journalStats?.win_rate >= 50 ? 'green' : 'red'}>
                        {journalStats?.win_rate?.toFixed(1) || 0}%
                      </Text>
                    </Card>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Total Trades</Text>
                      <Text ta="center" fz="xl" fw={700}>
                        {journalStats?.total_trades || 0}
                      </Text>
                    </Card>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Open Positions</Text>
                      <Text ta="center" fz="xl" fw={700}>
                        {journalStats?.open_trades || 0}
                      </Text>
                    </Card>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 3 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Total P/L</Text>
                      <Text ta="center" fz="xl" fw={700} 
                        c={journalStats?.total_profit_loss >= 0 ? 'green' : 'red'}>
                        {formatCurrency(journalStats?.total_profit_loss || 0)}
                      </Text>
                    </Card>
                  </Grid.Col>
                </Grid>
              )}

              {showTradeForm ? (
                <TradeForm
                  editTrade={editTrade || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  journalId={selectedJournal.id}
                />
              ) : (
                <Paper p="md" shadow="xs" radius="md">
                  <TradeList onEditTrade={handleEditTrade} />
                </Paper>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}