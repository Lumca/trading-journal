// src/pages/CalendarPage.tsx
import { useState } from 'react';
import { 
  Container, 
  Title, 
  Stack,
  Button,
  Group,
  Paper
} from '@mantine/core';
import { TradeCalendar } from '../components/TradeCalendar';
import { TradeForm } from '../components/TradeForm';
import { Trade } from '../lib/supabase';
import { useJournal } from '../contexts/JournalContext';
import { IconPlus } from '@tabler/icons-react';

export function CalendarPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | undefined>(undefined);
  const { selectedJournalId } = useJournal();

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditTrade(undefined);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditTrade(undefined);
  };

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={1}>Trade Calendar</Title>
          
          <Button 
            leftIcon={<IconPlus size={16} />}
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
            <TradeCalendar 
              onEditTrade={handleEditTrade} 
              journalId={selectedJournalId}
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}