// src/pages/TradeDetailPage.tsx
import {
  ActionIcon,
  Breadcrumbs,
  Center,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
  Anchor
} from '@mantine/core';
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { TradeView } from '../components/TradeView';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';

export function TradeDetailPage() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const { getTrade } = useSupabase();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrade();
  }, [tradeId]);

  const fetchTrade = async () => {
    if (!tradeId) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      const tradeData = await getTrade(parseInt(tradeId));
      
      if (!tradeData) {
        // Trade not found, redirect to dashboard
        navigate('/dashboard');
        return;
      }
      
      setTrade(tradeData);
    } catch (error) {
      console.error('Error fetching trade:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleRefresh = () => {
    fetchTrade();
  };

  const handleTradeUpdated = () => {
    fetchTrade();
  };

  const items = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: trade ? `Trade: ${trade.symbol}` : 'Trade Details', href: '#' },
  ];

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Breadcrumbs mb="lg">
          {items.map((item, index) => (
            <Anchor 
              component={Link} 
              to={item.href} 
              key={index}
              c={index === items.length - 1 ? undefined : "dimmed"}
            >
              {item.title}
            </Anchor>
          ))}
        </Breadcrumbs>
        <Center h={300}>
          <Loader size="xl" />
        </Center>
      </Container>
    );
  }

  if (!trade) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" spacing="md">
          <Text>Trade not found.</Text>
          <Anchor component={Link} to="/dashboard">
            Return to Dashboard
          </Anchor>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Breadcrumbs>
            {items.map((item, index) => (
              <Anchor 
                component={Link} 
                to={item.href} 
                key={index}
                c={index === items.length - 1 ? undefined : "dimmed"}
              >
                {item.title}
              </Anchor>
            ))}
          </Breadcrumbs>
          <ActionIcon variant="subtle" onClick={handleRefresh}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Group>

        <TradeView 
          trade={trade} 
          onBack={handleBackToDashboard} 
          onEdit={handleTradeUpdated}
        />
      </Stack>
    </Container>
  );
}