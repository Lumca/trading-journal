// src/pages/CalendarPage.tsx
import {
  Container,
  Group,
  Paper,
  Stack,
  Title
} from '@mantine/core';
import { TradeCalendar } from '../components/TradeCalendar';
import { useJournal } from '../contexts/JournalContext';

export function CalendarPage() {
  const { selectedJournalId } = useJournal();

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="apart">
          <Title order={1}>Trade Calendar</Title>
        </Group>

        <Paper p="md" shadow="xs" radius="md">
          <TradeCalendar journalId={selectedJournalId} />
        </Paper>
      </Stack>
    </Container>
  );
}