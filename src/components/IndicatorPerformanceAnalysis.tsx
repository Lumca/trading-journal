// src/components/IndicatorPerformanceAnalysis.tsx
import {
  Card,
  Title,
  Text,
  RingProgress,
  Group,
  Stack,
  Badge,
  Center,
  Loader,
  Table,
  Paper,
  Tooltip
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { 
  Bar, 
  BarChart, 
  Cell, 
  CartesianGrid, 
  Legend, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';

interface IndicatorPerformance {
  name: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  averageProfit: number;
  totalLoss: number;
  averageLoss: number;
  netProfitLoss: number;
  returnRatio: number; // Profit-to-loss ratio
  expectancy: number; // (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
}

export function IndicatorPerformanceAnalysis() {
  const [loading, setLoading] = useState(true);
  const [indicatorPerformance, setIndicatorPerformance] = useState<IndicatorPerformance[]>([]);
  const { getTrades, getTradeIndicators } = useSupabase();
  const { selectedJournalId, selectedJournal } = useJournal();

  useEffect(() => {
    fetchData();
  }, [selectedJournalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get all trades for the selected journal
      const trades = await getTrades(selectedJournalId);
      
      // Only consider closed trades for performance analysis
      const closedTrades = trades.filter(trade => trade.status === 'closed' && trade.profit_loss !== undefined);
      
      // Create a map to store indicator performance data
      const indicatorMap = new Map<string, {
        trades: number[];
        profits: number[];
        losses: number[];
      }>();
      
      // Process each trade and its indicators
      for (const trade of closedTrades) {
        // Get indicators used in this trade
        const tradeIndicators = await getTradeIndicators(trade.id);
        
        // Skip if no indicators were used
        if (!tradeIndicators || tradeIndicators.length === 0) continue;
        
        // Add trade to each indicator's statistics
        for (const indicator of tradeIndicators) {
          const name = indicator.indicator_name;
          
          // Initialize if this is the first trade with this indicator
          if (!indicatorMap.has(name)) {
            indicatorMap.set(name, {
              trades: [],
              profits: [],
              losses: []
            });
          }
          
          const data = indicatorMap.get(name)!;
          
          // Add trade ID to list
          data.trades.push(trade.id);
          
          // Track profit/loss
          const profitLoss = trade.profit_loss || 0;
          if (profitLoss > 0) {
            data.profits.push(profitLoss);
          } else if (profitLoss < 0) {
            data.losses.push(Math.abs(profitLoss)); // Store as positive number for easier math
          }
        }
      }
      
      // Calculate performance metrics for each indicator
      const performanceData: IndicatorPerformance[] = [];
      
      indicatorMap.forEach((data, name) => {
        const totalTrades = data.trades.length;
        const winningTrades = data.profits.length;
        const losingTrades = data.losses.length;
        
        // Skip indicators with too few trades for meaningful analysis
        if (totalTrades < 3) return;
        
        const winRate = (winningTrades / totalTrades) * 100;
        const lossRate = (losingTrades / totalTrades) * 100;
        
        const totalProfit = data.profits.reduce((sum, val) => sum + val, 0);
        const totalLoss = data.losses.reduce((sum, val) => sum + val, 0);
        
        const averageProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
        const averageLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;
        
        const netProfitLoss = totalProfit - totalLoss;
        
        // Calculate return ratio (profit-to-loss ratio)
        const returnRatio = averageLoss > 0 ? averageProfit / averageLoss : averageProfit;
        
        // Calculate expectancy
        const expectancy = (winRate / 100 * averageProfit) - (lossRate / 100 * averageLoss);
        
        performanceData.push({
          name,
          totalTrades,
          winningTrades,
          losingTrades,
          winRate,
          totalProfit,
          averageProfit,
          totalLoss,
          averageLoss,
          netProfitLoss,
          returnRatio,
          expectancy
        });
      });
      
      // Sort by most profitable
      performanceData.sort((a, b) => b.netProfitLoss - a.netProfitLoss);
      setIndicatorPerformance(performanceData);
    } catch (error) {
      console.error('Error fetching indicator performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  if (loading) {
    return (
      <Center p="xl">
        <Loader size="md" />
      </Center>
    );
  }

  if (indicatorPerformance.length === 0) {
    return (
      <Paper p="md" withBorder radius="md">
        <Center p="xl">
          <Stack align="center">
            <Title order={3}>No Indicator Data Available</Title>
            <Text c="dimmed">
              We need more closed trades with indicators to generate performance analysis.
            </Text>
          </Stack>
        </Center>
      </Paper>
    );
  }

  return (
    <Stack spacing="md">
      {/* Best & Worst Indicators Summary */}
      <Group grow>
        <Card withBorder shadow="sm">
          <Title order={4} mb="md">Best Performing Indicators</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Indicator</Table.Th>
                <Table.Th>Win Rate</Table.Th>
                <Table.Th>Net P/L</Table.Th>
                <Table.Th>Trades</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {indicatorPerformance.slice(0, 3).map((indicator) => (
                <Table.Tr key={indicator.name}>
                  <Table.Td>{indicator.name}</Table.Td>
                  <Table.Td>
                    <Text c={indicator.winRate >= 50 ? 'green' : 'red'} fw={500}>
                      {indicator.winRate.toFixed(1)}%
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c={indicator.netProfitLoss >= 0 ? 'green' : 'red'} fw={500}>
                      {formatCurrency(indicator.netProfitLoss)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{indicator.totalTrades}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
        
        <Card withBorder shadow="sm">
          <Title order={4} mb="md">Lowest Performing Indicators</Title>
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Indicator</Table.Th>
                <Table.Th>Win Rate</Table.Th>
                <Table.Th>Net P/L</Table.Th>
                <Table.Th>Trades</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {[...indicatorPerformance].sort((a, b) => a.netProfitLoss - b.netProfitLoss).slice(0, 3).map((indicator) => (
                <Table.Tr key={indicator.name}>
                  <Table.Td>{indicator.name}</Table.Td>
                  <Table.Td>
                    <Text c={indicator.winRate >= 50 ? 'green' : 'red'} fw={500}>
                      {indicator.winRate.toFixed(1)}%
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text c={indicator.netProfitLoss >= 0 ? 'green' : 'red'} fw={500}>
                      {formatCurrency(indicator.netProfitLoss)}
                    </Text>
                  </Table.Td>
                  <Table.Td>{indicator.totalTrades}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Group>

      {/* Charts */}
      <Group grow>
        <Card withBorder shadow="sm">
          <Title order={4} mb="md">Win Rate by Indicator</Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={indicatorPerformance}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                tick={{ fontSize: 12 }}
                height={60}
              />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <RechartsTooltip 
                formatter={(value: number) => [`${value.toFixed(1)}%`, 'Win Rate']}
              />
              <Bar dataKey="winRate" name="Win Rate" fill="#82ca9d">
                {indicatorPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? '#82ca9d' : '#ff8042'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        
        <Card withBorder shadow="sm">
          <Title order={4} mb="md">Net Profit/Loss by Indicator</Title>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={indicatorPerformance}
              margin={{ top: 10, right: 30, left: 0, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                tick={{ fontSize: 12 }}
                height={60}
              />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <RechartsTooltip 
                formatter={(value: number) => [formatCurrency(value), 'Net P/L']}
              />
              <Bar dataKey="netProfitLoss" name="Net P/L">
                {indicatorPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.netProfitLoss >= 0 ? '#82ca9d' : '#ff8042'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Group>

      {/* Details Section */}
      <Card withBorder shadow="sm">
        <Title order={4} mb="md">Detailed Indicator Analysis</Title>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Indicator</Table.Th>
              <Table.Th>Trades</Table.Th>
              <Table.Th>Win Rate</Table.Th>
              <Table.Th>Avg. Win</Table.Th>
              <Table.Th>Avg. Loss</Table.Th>
              <Table.Th>Return Ratio</Table.Th>
              <Table.Th>Expectancy</Table.Th>
              <Table.Th>Net P/L</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {indicatorPerformance.map((indicator) => (
              <Table.Tr key={indicator.name}>
                <Table.Td>{indicator.name}</Table.Td>
                <Table.Td>
                  <Tooltip label={`${indicator.winningTrades} wins, ${indicator.losingTrades} losses`}>
                    <Text>{indicator.totalTrades}</Text>
                  </Tooltip>
                </Table.Td>
                <Table.Td>
                  <Text c={indicator.winRate >= 50 ? 'green' : 'red'} fw={500}>
                    {indicator.winRate.toFixed(1)}%
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c="green">{formatCurrency(indicator.averageProfit)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text c="red">{formatCurrency(indicator.averageLoss)}</Text>
                </Table.Td>
                <Table.Td>
                  <Text fw={500}>
                    {indicator.returnRatio.toFixed(2)}x
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c={indicator.expectancy >= 0 ? 'green' : 'red'} fw={500}>
                    {formatCurrency(indicator.expectancy)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c={indicator.netProfitLoss >= 0 ? 'green' : 'red'} fw={700}>
                    {formatCurrency(indicator.netProfitLoss)}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>
      
      <Text size="sm" c="dimmed" fst="italic">
        Note: The analysis excludes indicators with fewer than 3 trades for statistical significance.
        Return Ratio compares average win to average loss. Expectancy is the expected value per trade.
      </Text>
    </Stack>
  );
}