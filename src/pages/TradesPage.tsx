// src/pages/TradesPage.tsx
import { Container, Group, Paper, Stack, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { TradeList } from '../components/TradeList';
import { useJournal } from '../contexts/JournalContext';
import { Trade } from '../lib/supabase';

export function TradesPage() {
  const { selectedJournalId, selectedJournal } = useJournal();
  const navigate = useNavigate();

  const handleViewTrade = (trade: Trade) => {
    navigate(`/trades/${trade.id}`);
  };

  // Custom title showing all trades or filtered by journal
  const pageTitle = selectedJournal 
    ? `Trades - ${selectedJournal.name}` 
    : "All Trades";

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="apart">
          <Title order={1}>{pageTitle}</Title>
        </Group>

        <Paper p="md" shadow="xs" radius="md">
          <TradeList 
            onViewTrade={handleViewTrade}
            journalId={selectedJournalId}
          />
        </Paper>
      </Stack>
    </Container>
  );
}