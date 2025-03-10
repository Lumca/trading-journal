// src/pages/CalendarPage.tsx
import { useState } from 'react';
import { 
  Container, 
  Title, 
  Stack,
  Paper,
  Group,
  Box
} from '@mantine/core';
import { TradeCalendar } from '../components/TradeCalendar';
import { useJournal } from '../contexts/JournalContext';
import { TradeDrawerButton } from '../components/TradeDrawerButton';

export function CalendarPage() {
  const { selectedJournalId } = useJournal();

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={1}>Trade Calendar</Title>
        </Group>

        <Paper p="md" shadow="xs" radius="md">
          <TradeCalendar journalId={selectedJournalId} />
        </Paper>
      </Stack>
    </Container>
  );
}