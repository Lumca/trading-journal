// src/pages/DashboardPage.tsx
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
  RingProgress,
  useMantineTheme,
  Box,
  Loader,
  Center
} from '@mantine/core';
import { TradeList } from '../components/TradeList';
import { TradeForm } from '../components/TradeForm';
import { useSupabase, TradeStats } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';
import { FaPlus } from 'react-icons/fa';

export function DashboardPage() {
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | undefined>(undefined);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { getTrades, getTradeStats } = useSupabase();
  const theme = useMantineTheme();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tradesData, statsData] = await Promise.all([
        getTrades(),
        getTradeStats()
      ]);
      
      setTrades(tradesData);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTrade = (trade: Trade) => {
    setEditTrade(trade);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditTrade(undefined);
    fetchData();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditTrade(undefined);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 60px)' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Title order={1}>Trading Journal</Title>

        <Grid>
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text ta="center" fz="lg" fw={500} mt="md">
                Win Rate
              </Text>
              <Box mx="auto" mt="md">
                <RingProgress
                  size={120}
                  thickness={12}
                  roundCaps
                  sections={[
                    { value: stats?.win_rate || 0, color: 'green' },
                    { value: 100 - (stats?.win_rate || 0), color: 'red' },
                  ]}
                  label={
                    <Text ta="center" fz="xl" fw={700}>
                      {(stats?.win_rate || 0).toFixed(1)}%
                    </Text>
                  }
                />
              </Box>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text ta="center" fz="lg" fw={500}>
                Total Trades
              </Text>
              <Text ta="center" fz="xl" fw={700} mt="md">
                {stats?.total_trades || 0}
              </Text>
              <Group position="center" spacing="xs" mt="xs">
                <Text ta="center" size="sm" c="green">
                  {stats?.winning_trades || 0} wins
                </Text>
                <Text ta="center" size="sm">•</Text>
                <Text ta="center" size="sm" c="red">
                  {stats?.losing_trades || 0} losses
                </Text>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text ta="center" fz="lg" fw={500}>
                Open Positions
              </Text>
              <Text ta="center" fz="xl" fw={700} mt="md">
                {stats?.open_trades || 0}
              </Text>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 3 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Text ta="center" fz="lg" fw={500}>
                Total P/L
              </Text>
              <Text 
                ta="center" 
                fz="xl" 
                fw={700} 
                mt="md"
                c={stats && stats.total_profit_loss >= 0 ? 'green' : 'red'}
              >
                {formatCurrency(stats?.total_profit_loss || 0)}
              </Text>
              <Text ta="center" size="sm" mt="xs">
                Avg: {formatCurrency(stats?.average_profit_loss || 0)}
              </Text>
            </Card>
          </Grid.Col>
        </Grid>

        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart">
                <Text fz="lg" fw={500}>Largest Win</Text>
                <Text fz="lg" fw={700} c="green">
                  {formatCurrency(stats?.largest_win || 0)}
                </Text>
              </Group>
            </Card>
          </Grid.Col>
          
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart">
                <Text fz="lg" fw={500}>Largest Loss</Text>
                <Text fz="lg" fw={700} c="red">
                  {formatCurrency(stats?.largest_loss || 0)}
                </Text>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        <Group position="apart" mt="md">
          <Title order={2}>Trades</Title>
          <Button 
            leftSection={<FaPlus size={14} />} 
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
          />
        ) : (
          <Paper p="md" shadow="xs" radius="md">
            <TradeList onEditTrade={handleEditTrade} />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}