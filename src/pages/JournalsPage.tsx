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
  Loader
} from '@mantine/core';
import { useSupabase } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Journal } from '../lib/types';
import { JournalList } from '../components/JournalList';
import { JournalForm } from '../components/JournalForm';
import { TradeList } from '../components/TradeList';
import { TradeForm } from '../components/TradeForm';
import { Trade } from '../lib/supabase';
import { IconPlus } from '@tabler/icons-react';
import { TradeStatsDisplay } from '../components/TradeStats';

export function JournalsPage() {
  const [showJournalForm, setShowJournalForm] = useState(false);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [selectedJournalForView, setSelectedJournalForView] = useState<Journal | null>(null);
  const [editJournal, setEditJournal] = useState<Journal | null>(null);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
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

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setShowTradeForm(true);
  };

  const handleFormSuccess = () => {
    setShowJournalForm(false);
    setShowTradeForm(false);
    setEditJournal(null);
    setEditTrade(null);
    
    // Refresh journals in the context
    refetchJournals();
    
    // Refresh stats if in trade view
    if (view === 'trades' && selectedJournalForView) {
      fetchJournalStats();
    }
  };

  const handleFormCancel = () => {
    setShowJournalForm(false);
    setShowTradeForm(false);
    setEditJournal(null);
    setEditTrade(null);
  };

  const handleBackToJournals = () => {
    setSelectedJournalForView(null);
    setView('journals');
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
  <Button 
    leftIcon={<IconPlus size={16} />}
    onClick={() => setShowTradeForm(true)}
    disabled={showTradeForm}
  >
    Add Trade
  </Button>
</Group>

          {selectedJournalForView && (
  <>
    {loading ? (
      <Center my="xl">
        <Loader size="lg" />
      </Center>
    ) : (
      <TradeStatsDisplay stats={journalStats} formatCurrency={formatCurrency} />
    )}


              {showTradeForm ? (
                <TradeForm
                  editTrade={editTrade || undefined}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  journalId={selectedJournalForView.id}
                />
              ) : (
                <Paper p="md" shadow="xs" radius="md">
                  <TradeList 
                    onEditTrade={handleEditTrade}
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