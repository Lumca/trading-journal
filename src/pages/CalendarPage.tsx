// src/pages/CalendarPage.tsx
// Place this file in your src/pages directory
import { useState } from 'react';
import { 
  Container, 
  Title, 
  Stack,
  Paper
} from '@mantine/core';
import { TradeCalendar } from '../components/TradeCalendar';
import { TradeForm } from '../components/TradeForm';
import { Trade } from '../lib/supabase';

export function CalendarPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | undefined>(undefined);

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
        <Title order={1}>Trade Calendar</Title>

        {showForm ? (
          <TradeForm 
            editTrade={editTrade} 
            onSuccess={handleFormSuccess} 
            onCancel={handleFormCancel} 
          />
        ) : (
          <TradeCalendar onEditTrade={handleEditTrade} />
        )}
      </Stack>
    </Container>
  );
}