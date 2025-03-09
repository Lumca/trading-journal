// src/pages/StatisticsPage.tsx
import { useState, useEffect } from 'react';
import { 
  Container, 
  Title, 
  Stack, 
  Paper, 
  Grid, 
  Text, 
  Group, 
  Select, 
  Tabs, 
  RingProgress,
  SegmentedControl,
  Loader,
  Center,
  Card,
  useMantineTheme
} from '@mantine/core';
import { 
  IconChartPie, 
  IconChartBar, 
  IconCalendarStats, 
  IconCoin,
  IconArrowUpRight,
  IconArrowDownRight
} from '@tabler/icons-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useJournal } from '../contexts/JournalContext';
import { Trade } from '../lib/supabase';
import { TradeStatsDisplay } from '../components/TradeStats';

// Chart components
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export function StatisticsPage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [performanceGrouping, setPerformanceGrouping] = useState('month');
  const [activeTab, setActiveTab] = useState('performance');
  const { getTrades, getTradeStats, getUserSettings } = useSupabase();
  const { selectedJournalId, selectedJournal } = useJournal();
  const [stats, setStats] = useState<any>(null);
  const [userSettings, setUserSettings] = useState<any>(null);
  const theme = useMantineTheme();

  useEffect(() => {
    fetchData();
  }, [selectedJournalId, timeframe]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get trades
      const tradesData = await getTrades(selectedJournalId);
      
      // Filter trades based on timeframe
      const filteredTrades = filterTradesByTimeframe(tradesData, timeframe);
      setTrades(filteredTrades);
      
      // Get stats
      const statsData = await getTradeStats(selectedJournalId);
      setStats(statsData);
      
      // Get user settings for strategies
      const settings = await getUserSettings();
      setUserSettings(settings);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTradesByTimeframe = (trades: Trade[], timeframe: string): Trade[] => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        return trades;
    }
    
    return trades.filter(trade => {
      const entryDate = new Date(trade.entry_date);
      return entryDate >= startDate;
    });
  };

  const formatCurrency = (value: number) => {
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  // Helper functions for chart data

  // Get profit/loss by time period with flexible grouping
  const getProfitLossByTimePeriod = () => {
    const tradesByPeriod: { [key: string]: Trade[] } = {};
    
    trades.forEach(trade => {
      if (trade.status === 'closed' && trade.exit_date) {
        const date = new Date(trade.exit_date);
        let periodKey = '';
        
        switch (performanceGrouping) {
          case 'day':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            break;
          case 'week':
            // Get the first day of the week (Sunday)
            const firstDay = new Date(date);
            const day = date.getDay();
            firstDay.setDate(date.getDate() - day);
            periodKey = `Week of ${firstDay.toLocaleDateString()}`;
            break;
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            break;
          case 'year':
            periodKey = `${date.getFullYear()}`;
            break;
        }
        
        if (!tradesByPeriod[periodKey]) {
          tradesByPeriod[periodKey] = [];
        }
        
        tradesByPeriod[periodKey].push(trade);
      }
    });
    
    // Calculate profit/loss for each period
    const chartData = Object.keys(tradesByPeriod)
      .sort()
      .map(periodKey => {
        const periodTrades = tradesByPeriod[periodKey];
        const totalPL = periodTrades.reduce((sum, trade) => sum + (trade.profit_loss || 0), 0);
        
        let displayLabel = '';
        
        if (performanceGrouping === 'month') {
          const [year, month] = periodKey.split('-');
          const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          displayLabel = `${monthNames[parseInt(month) - 1]} ${year}`;
        } else if (performanceGrouping === 'day') {
          const dateParts = periodKey.split('-');
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          displayLabel = date.toLocaleDateString();
        } else {
          displayLabel = periodKey;
        }
        
        return {
          period: displayLabel,
          profit: totalPL > 0 ? totalPL : 0,
          loss: totalPL < 0 ? Math.abs(totalPL) : 0,
          total: totalPL
        };
      });
      
    return chartData;
  };

  // Get win/loss ratio by strategy
  const getWinLossByStrategy = () => {
    const strategyStats: { [key: string]: { wins: number, losses: number } } = {};
    
    trades.forEach(trade => {
      if (trade.status === 'closed') {
        const strategy = trade.strategy || 'Unknown';
        
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = { wins: 0, losses: 0 };
        }
        
        if (trade.profit_loss && trade.profit_loss > 0) {
          strategyStats[strategy].wins++;
        } else if (trade.profit_loss && trade.profit_loss < 0) {
          strategyStats[strategy].losses++;
        }
      }
    });
    
    const chartData = Object.keys(strategyStats).map(strategy => {
      const { wins, losses } = strategyStats[strategy];
      const total = wins + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      
      return {
        strategy,
        wins,
        losses,
        total,
        winRate: Math.round(winRate)
      };
    });
    
    return chartData.sort((a, b) => b.total - a.total);
  };

  // Get asset class distribution by count
  const getAssetClassDistribution = () => {
    const assetCounts: { [key: string]: number } = {};
    const assetProfitLoss: { [key: string]: number } = {};
    
    trades.forEach(trade => {
      if (trade.status === 'closed') {
        // Extract asset class from symbol using more accurate detection
        let assetClass = 'Stocks';
        
        if (trade.symbol.includes('/')) {
          // Check for cryptocurrency pairs vs forex
          if (
            trade.symbol.includes('BTC') || 
            trade.symbol.includes('ETH') || 
            trade.symbol.includes('LTC') || 
            trade.symbol.includes('XRP')
          ) {
            assetClass = 'Crypto';
          } else {
            assetClass = 'Forex';
          }
        }
        
        // Count trades by asset class
        assetCounts[assetClass] = (assetCounts[assetClass] || 0) + 1;
        
        // Sum profit/loss by asset class
        if (trade.profit_loss) {
          assetProfitLoss[assetClass] = (assetProfitLoss[assetClass] || 0) + trade.profit_loss;
        }
      }
    });
    
    // Create chart data
    const chartData = Object.keys(assetCounts).map(assetClass => ({
      name: assetClass,
      value: assetCounts[assetClass],
      profitLoss: assetProfitLoss[assetClass] || 0
    }));
    
    return chartData;
  };

  // Get equity curve data
  const getEquityCurveData = () => {
    // Filter to closed trades and sort by exit date
    const closedTrades = trades
      .filter(trade => trade.status === 'closed' && trade.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());
    
    if (closedTrades.length === 0) return [];
    
    // Calculate cumulative P/L
    let cumulative = 0;
    
    const chartData = closedTrades.map(trade => {
      const date = new Date(trade.exit_date!);
      cumulative += trade.profit_loss || 0;
      
      return {
        date: date.toLocaleDateString(),
        equity: cumulative
      };
    });
    
    // Add starting point
    chartData.unshift({
      date: 'Start',
      equity: 0
    });
    
    return chartData;
  };

  // Calculate average trade duration correctly
  const calculateAvgTradeDuration = () => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exit_date);
    
    if (closedTrades.length === 0) {
      return 'N/A';
    }
    
    const durations = closedTrades.map(t => {
      const entry = new Date(t.entry_date);
      const exit = new Date(t.exit_date!);
      // Calculate the difference in milliseconds and convert to days
      // Use Math.max to ensure we don't get negative values due to timezone issues
      return Math.max(0, Math.floor((exit.getTime() - entry.getTime()) / (1000 * 60 * 60 * 24)));
    });
    
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    
    // Return "Same day" if less than 1 day
    if (avgDuration < 1) {
      return "Same day";
    }
    
    return `${Math.round(avgDuration)} days`;
  };

  // COLORS
  const COLORS = [
    theme.colors.blue[6],
    theme.colors.green[6],
    theme.colors.orange[6],
    theme.colors.cyan[6],
    theme.colors.pink[6],
    theme.colors.violet[6],
  ];

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 150px)' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack spacing="xl">
        <Group position="apart">
          <Title order={1}>Trading Statistics</Title>
          
          <Select
            placeholder="Select Timeframe"
            value={timeframe}
            onChange={(value) => setTimeframe(value || 'all')}
            data={[
              { value: 'week', label: 'Last 7 Days' },
              { value: 'month', label: 'Last 30 Days' },
              { value: 'quarter', label: 'Last 3 Months' },
              { value: 'year', label: 'Last 12 Months' },
              { value: 'all', label: 'All Time' }
            ]}
            style={{ width: 200 }}
          />
        </Group>

        {/* Summary statistics */}
        <TradeStatsDisplay stats={stats} formatCurrency={formatCurrency} />

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="performance" icon={<IconChartBar size={14} />}>
              Performance
            </Tabs.Tab>
            <Tabs.Tab value="strategies" icon={<IconChartPie size={14} />}>
              Strategies
            </Tabs.Tab>
            <Tabs.Tab value="distribution" icon={<IconCalendarStats size={14} />}>
              Distribution
            </Tabs.Tab>
            <Tabs.Tab value="equity" icon={<IconCoin size={14} />}>
              Equity Curve
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="performance" pt="md">
            <Paper p="md" shadow="xs" radius="md">
              <Group position="apart" mb="lg">
                <Title order={3}>Performance by Period</Title>
                <SegmentedControl
                  value={performanceGrouping}
                  onChange={setPerformanceGrouping}
                  data={[
                    { label: 'Daily', value: 'day' },
                    { label: 'Weekly', value: 'week' },
                    { label: 'Monthly', value: 'month' },
                    { label: 'Yearly', value: 'year' },
                  ]}
                />
              </Group>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={getProfitLossByTimePeriod()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="period" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 12 }}
                    height={60}
                  />
                  <YAxis 
                    tickFormatter={(value) => formatCurrency(value)} 
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="profit" stackId="a" fill={theme.colors.green[6]} name="Profit" />
                  <Bar dataKey="loss" stackId="a" fill={theme.colors.red[6]} name="Loss" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="strategies" pt="md">
            <Paper p="md" shadow="xs" radius="md">
              <Title order={3} mb="md">Performance by Strategy</Title>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={getWinLossByStrategy()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="strategy" />
                  <YAxis yAxisId="left" orientation="left" />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    tickFormatter={(value) => `${value}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="wins" stackId="a" fill={theme.colors.green[6]} name="Wins" />
                  <Bar yAxisId="left" dataKey="losses" stackId="a" fill={theme.colors.red[6]} name="Losses" />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="winRate" 
                    stroke={theme.colors.blue[6]} 
                    name="Win Rate %" 
                    strokeWidth={2}
                    dot={{ r: 5 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="distribution" pt="md">
            <Grid>
              <Grid.Col md={6}>
                <Paper p="md" shadow="xs" radius="md" style={{ height: '100%' }}>
                  <Title order={3} mb="md">Trade Distribution by Asset Class</Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getAssetClassDistribution()}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {getAssetClassDistribution().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name, props) => [`${value} trades`, name]} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid.Col>
              <Grid.Col md={6}>
                <Paper p="md" shadow="xs" radius="md" style={{ height: '100%' }}>
                  <Title order={3} mb="md">Profit/Loss by Asset Class</Title>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={getAssetClassDistribution()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar 
                        dataKey="profitLoss" 
                        name="Profit/Loss"
                      >
                        {getAssetClassDistribution().map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.profitLoss >= 0 ? theme.colors.green[6] : theme.colors.red[6]} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid.Col>
            </Grid>
          </Tabs.Panel>

          <Tabs.Panel value="equity" pt="md">
            <Paper p="md" shadow="xs" radius="md">
              <Title order={3} mb="md">Equity Curve</Title>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={getEquityCurveData()}
                  margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    angle={-45} 
                    textAnchor="end" 
                    tick={{ fontSize: 12 }}
                    height={60}
                  />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)} 
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke={theme.colors.blue[6]} 
                    dot={{ r: 1 }} 
                    activeDot={{ r: 5 }}
                    strokeWidth={2}
                    name="Equity"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        {/* Additional statistics cards */}
        <Grid>
          <Grid.Col md={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart">
                <Text fw={500}>Best Trading Day</Text>
                <IconArrowUpRight color={theme.colors.green[6]} />
              </Group>
              
              <Text fz="xl" fw={700} mt="md" color={theme.colors.green[6]}>
                {stats && stats.total_profit_loss > 0 
                  ? formatCurrency(trades
                      .filter(t => t.status === 'closed' && t.profit_loss && t.profit_loss > 0)
                      .reduce((best, trade) => Math.max(best, trade.profit_loss || 0), 0))
                  : formatCurrency(0)}
              </Text>
              
              <Text fz="sm" c="dimmed" mt="sm">
                Best single-day profit
              </Text>
            </Card>
          </Grid.Col>
          
          <Grid.Col md={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart">
                <Text fw={500}>Worst Trading Day</Text>
                <IconArrowDownRight color={theme.colors.red[6]} />
              </Group>
              
              <Text fz="xl" fw={700} mt="md" color={theme.colors.red[6]}>
                {stats && stats.largest_loss
                  ? formatCurrency(Math.abs(stats.largest_loss))
                  : formatCurrency(0)}
              </Text>
              
              <Text fz="sm" c="dimmed" mt="sm">
                Worst single-day loss
              </Text>
            </Card>
          </Grid.Col>
          
          <Grid.Col md={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group position="apart">
                <Text fw={500}>Average Trade Duration</Text>
              </Group>
              
              <Text fz="xl" fw={700} mt="md">
                {calculateAvgTradeDuration()}
              </Text>
              
              <Text fz="sm" c="dimmed" mt="sm">
                Average time in market per trade
              </Text>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}