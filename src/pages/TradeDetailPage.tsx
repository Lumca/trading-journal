// src/pages/TradeDetailPage.tsx - Updated with improved navigation
import { Button, Center, Container, Loader, Stack, Title } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { TradeView } from '../components/TradeView';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';

export function TradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getTrade } = useSupabase();
  
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the previous page from the location state if available
  const previousPath = location.state?.from || '/dashboard';

  useEffect(() => {
    fetchTradeDetails();
  }, [tradeId]);

  const fetchTradeDetails = async () => {
    if (!tradeId) {
      setError('No trade ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const tradeData = await getTrade(parseInt(tradeId));
      if (tradeData) {
        setTrade(tradeData);
        setError(null);
      } else {
        setError('Trade not found');
      }
    } catch (err) {
      console.error('Error fetching trade:', err);
      setError('Error loading trade details');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleTradeUpdated = () => {
    fetchTradeDetails(); // Refresh trade data
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Center>
          <Loader size="xl" />
        </Center>
      </Container>
    );
  }

  if (error || !trade) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="md">
          <Title order={1}>Trade Details</Title>
          <Center>
            <Title order={3} c="red">
              {error || 'Trade not found'}
            </Title>
          </Center>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Title order={1}>Trade Details</Title>
        <TradeView 
          trade={trade} 
          onBack={handleBack} 
          onEdit={handleTradeUpdated}
        />
      </Stack>
    </Container>
  );
}