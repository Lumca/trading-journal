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
  ActionIcon,
  Tooltip
} from '@mantine/core';
import { useSupabase } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Journal } from '../lib/types';
import { JournalList } from '../components/JournalList';
import { JournalForm } from '../components/JournalForm';
import { TradeList } from '../components/TradeList';
import { TradeView } from '../components/TradeView';
import { Trade } from '../lib/supabase';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { TradeDrawerButton } from '../components/TradeDrawerButton';

export function JournalsPage() {
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [selectedJournalForView, setSelectedJournalForView] = useState<Journal | null>(null);
  const [editJournal, setEditJournal] = useState<Journal | null>(null);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(false);
  const [journalStats, setJournalStats] = useState<any>(null);
  const [view, setView] = useState<'journals' | 'trades'>('journals');
  
  const { getJournalStats } = useSupabase();
  const { refetchJournals } = useJournal();

  useEffect(() => {
    if (selectedJournalForView) {
      fetchJournalStats();
    }
  }, [selectedJournalForView]);

  const fetchJournalStats = async () => {
    if (!selectedJournalForView) return;
    
    setLoading(true);
    try {
      const stats = await getJournalStats(selectedJournalForView.id);
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
    setSelectedJournalForView(journal);
    setView('trades');
  };

  const handleViewTrade = (trade: Trade) => {
    setViewTrade(trade);
  };

  const handleFormSuccess = () => {
    setShowJournalForm(false);
    setEditJournal(null);
    
    // Refresh journals in the context
    refetchJournals();
    
    // Refresh stats if in trade view
    if (view === 'trades' && selectedJournalForView) {
      fetchJournalStats();
    }
  };

  const handleFormCancel = () => {
    setShowJournalForm(false);
    setEditJournal(null);
  };

  const handleBackFromView = () => {
    setViewTrade(null);
  };

  const handleBackToJournals = () => {
    setSelectedJournalForView(null);
    setView('journals');
    setViewTrade(null);
  };

  const formatCurrency = (value: number) => {
    if (!selectedJournalForView) return '$0.00';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: selectedJournalForView.base_currency || 'USD',
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
              <Button variant="outline" onClick={handleBackToJournals}>
                Back to Journals
              </Button>
              <Title order={1}>
                {selectedJournalForView?.name}
                {' '}
                <Badge color={selectedJournalForView?.is_active ? 'green' : 'gray'} size="lg">
                  {selectedJournalForView?.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </Title>
            </Group>
            <Group>
              <Tooltip label="Refresh Data">
                <ActionIcon variant="light" onClick={fetchJournalStats}>
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
              <TradeDrawerButton 
                mode="add" 
                onSuccess={fetchJournalStats} 
                journalId={selectedJournalForView?.id}
              />
            </Group>
          </Group>

          {selectedJournalForView && (
            <>
              {loading ? (
                <Center my="xl">
                  <Loader size="lg" />
                </Center>
              ) : (
                <Grid mb="xl">
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Win Rate</Text>
                      <Text ta="center" fz="xl" fw={700} c={journalStats?.win_rate >= 50 ? 'green' : 'red'}>
                        {journalStats?.win_rate?.toFixed(1) || 0}%
                      </Text>
                      <Group position="center" spacing="sm" mt="sm" style={{ justifyContent: 'center' }}>
                        <Badge color="green">{journalStats?.winning_trades || 0} wins</Badge>
                        <Badge color="red">{journalStats?.losing_trades || 0} losses</Badge>
                      </Group>
                      <Text ta="center" size="xs" mt="xs" c="dimmed">
                        Based on closed trades only
                      </Text>
                    </Card>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Total Trades</Text>
                      <Text ta="center" fz="xl" fw={700}>
                        {journalStats?.total_trades || 0}
                      </Text>
                      <Group position="center" mt="sm" style={{ justifyContent: 'center' }}>
                        <Badge color="blue">{journalStats?.open_trades || 0} open positions</Badge>
                        <Badge color="gray">{journalStats ? (journalStats.total_trades - journalStats.open_trades) : 0} closed</Badge>
                      </Group>
                    </Card>
                  </Grid.Col>
                  
                  <Grid.Col span={{ base: 12, md: 4 }}>
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                      <Text ta="center" fz="lg" fw={500}>Total P/L</Text>
                      <Text ta="center" fz="xl" fw={700} 
                        c={journalStats?.total_profit_loss >= 0 ? 'green' : 'red'}>
                        {formatCurrency(journalStats?.total_profit_loss || 0)}
                      </Text>
                      <Group position="center" spacing="sm" mt="sm" style={{ justifyContent: 'center' }}>
                        <Group spacing={4}>
                          <Text size="sm" fw={500}>Best:</Text>
                          <Text size="sm" c="green">
                            {formatCurrency(journalStats?.largest_win || 0)}
                          </Text>
                        </Group>
                        <Text size="sm">•</Text>
                        <Group spacing={4}>
                          <Text size="sm" fw={500}>Worst:</Text>
                          <Text size="sm" c="red">
                            {formatCurrency(Math.abs(journalStats?.largest_loss || 0))}
                          </Text>
                        </Group>
                      </Group>
                    </Card>
                  </Grid.Col>
                </Grid>
              )}

              {viewTrade ? (
                <TradeView
                  trade={viewTrade}
                  onBack={handleBackFromView}
                  onEdit={() => {}}
                />
              ) : (
                <Paper p="md" shadow="xs" radius="md">
                  <TradeList 
                    onViewTrade={handleViewTrade}
                    journalId={selectedJournalForView.id}
                    onTradeUpdated={fetchJournalStats}
                  />
                </Paper>
              )}
            </>
          )}
        </>
      )}
    </Container>
  );
}