// src/components/TradeStatsDisplay.tsx
import { Badge, Box, Card, Grid, Group, RingProgress, Text } from '@mantine/core';
import { TradeStats } from '../contexts/SupabaseContext';

interface TradeStatsProps {
  stats: TradeStats | null;
  formatCurrency: (value: number) => string;
}

export function TradeStatsDisplay({ stats, formatCurrency }: TradeStatsProps) {
  if (!stats) {
    return null;
  }

  return (
    <Grid gutter="md">
      {/* Win Rate Card */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
          <Text ta="center" fz="lg" fw={500} mb="md">
            Win Rate
          </Text>
          <Box mx="auto" style={{ display: 'flex', justifyContent: 'center' }}>
            <RingProgress
              size={120}
              thickness={12}
              roundCaps
              sections={[
                { value: stats.win_rate || 0, color: 'green' },
                { value: 100 - (stats.win_rate || 0), color: 'red' },
              ]}
              label={
                <Text ta="center" fz="xl" fw={700}>
                  {(stats.win_rate || 0).toFixed(1)}%
                </Text>
              }
            />
          </Box>
          <Group justify="center" mt="md" style={{ justifyContent: 'center' }}>
            <Badge color="green" size="md">{stats.winning_trades || 0} wins</Badge>
            <Badge color="red" size="md">{stats.losing_trades || 0} losses</Badge>
          </Group>
          <Text ta="center" size="xs" mt="xs" c="dimmed">
            Based on closed trades only
          </Text>
        </Card>
      </Grid.Col>

      {/* Trade Count Card */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
          <Text ta="center" fz="lg" fw={500} mb="md">
            Trade Summary
          </Text>
          <Text ta="center" fz="xl" fw={700}>
            {stats.total_trades || 0} Total
          </Text>
          <Group justify="center" mt="md" style={{ justifyContent: 'center' }}>
            <Badge color="blue" size="md">{stats.open_trades || 0} open</Badge>
            <Badge color="gray" size="md">{stats.total_trades - stats.open_trades} closed</Badge>
            {stats.planned_trades > 0 && (
              <Badge color="yellow" size="md">{stats.planned_trades} planned</Badge>
            )}
          </Group>
          <Group justify="center" mt="md" style={{ justifyContent: 'center' }}>
            <Text size="sm" fw={500}>Avg P/L:</Text>
            <Text 
              size="sm" 
              fw={600}
              c={stats.average_profit_loss >= 0 ? 'green' : 'red'}
            >
              {formatCurrency(stats.average_profit_loss || 0)}
            </Text>
          </Group>
        </Card>
      </Grid.Col>

      {/* P/L Card */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
          <Text ta="center" fz="lg" fw={500} mb="md">
            Profit & Loss
          </Text>
          <Text 
            ta="center" 
            fz="xl" 
            fw={700}
            c={stats.total_profit_loss >= 0 ? 'green' : 'red'}
          >
            {formatCurrency(stats.total_profit_loss || 0)}
          </Text>
          <Group justify="center" mt="md" style={{ justifyContent: 'center' }}>
            <Group gap={4}>
              <Text size="sm" fw={500}>Best trade:</Text>
              <Text size="sm" fw={600} c="green">
                {formatCurrency(stats.largest_win || 0)}
              </Text>
            </Group>
          </Group>
          <Group justify="center" mt="xs" style={{ justifyContent: 'center' }}>
            <Group gap={4}>
              <Text size="sm" fw={500}>Worst trade:</Text>
              <Text size="sm" fw={600} c="red">
                {formatCurrency(Math.abs(stats.largest_loss || 0))}
              </Text>
            </Group>
          </Group>
        </Card>
      </Grid.Col>

      {/* New Fees Card */}
      <Grid.Col span={{ base: 12, md: 3 }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
          <Text ta="center" fz="lg" fw={500} mb="md">
            Trading Fees
          </Text>
          <Text 
            ta="center" 
            fz="xl" 
            fw={700}
            c="red"
          >
            {formatCurrency(stats.total_fees || 0)}
          </Text>
          <Text ta="center" size="sm" mt="md">
            Total fees across all trades
          </Text>
          <Text ta="center" size="xs" mt="xs" c="dimmed">
            Fees are deducted from profit/loss calculations
          </Text>
        </Card>
      </Grid.Col>
    </Grid>
  );
}