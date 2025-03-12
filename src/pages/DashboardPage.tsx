// src/pages/DashboardPage.tsx
import {
  ActionIcon,
  Badge,
  Box,
  Card,
  Center,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  RingProgress,
  Stack,
  Table,
  Text,
  Title,
  Tooltip
} from '@mantine/core';
import { IconRefresh, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { 
  Area, 
  AreaChart, 
  Bar, 
  BarChart, 
  CartesianGrid, 
  Cell, 
  Legend, 
  Pie, 
  PieChart, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  XAxis, 
  YAxis 
} from 'recharts';
import { TradeDrawerButton } from '../components/TradeDrawerButton';
import { TradeList } from '../components/TradeList';
import { TradeStatsDisplay } from '../components/TradeStats';
import { TradeView } from '../components/TradeView';
import { useJournal } from '../contexts/JournalContext';
import { TradeStats, useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';

export function DashboardPage() {
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const { getTrades, getTradeStats } = useSupabase();
  const { selectedJournalId, selectedJournal } = useJournal();

  useEffect(() => {
    fetchData();
  }, [selectedJournalId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tradesData, statsData] = await Promise.all([
        getTrades(selectedJournalId),
        getTradeStats(selectedJournalId)
      ]);
      
      setTrades(tradesData);
      setStats(statsData);
      
      // Get the 5 most recent trades (excluding planned trades)
      const executedTrades = tradesData.filter(trade => trade.status !== 'planned');
      const sortedTrades = [...executedTrades].sort(
        (a, b) => new Date(b.entry_date).getTime() - new Date(a.entry_date).getTime()
      );
      setRecentTrades(sortedTrades.slice(0, 5));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTrade = (trade: Trade) => {
    setViewTrade(trade);
  };

  const handleBackFromView = () => {
    setViewTrade(null);
  };

  const formatCurrency = (value: number) => {
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };
  
  // Generate equity curve data
  const getEquityCurveData = () => {
    const closedTrades = trades
      .filter(trade => trade.status === 'closed' && trade.exit_date)
      .sort((a, b) => new Date(a.exit_date!).getTime() - new Date(b.exit_date!).getTime());
    
    if (closedTrades.length === 0) return [];
    
    let cumulative = 0;
    
    return closedTrades.map(trade => {
      const date = new Date(trade.exit_date!);
      cumulative += trade.profit_loss || 0;
      
      return {
        date: date.toLocaleDateString(),
        equity: cumulative
      };
    });
  };
  
  // Generate distribution by asset type
  const getAssetDistribution = () => {
    const distribution: {[key: string]: number} = {};
    
    // Only include executed trades in the distribution
    const executedTrades = trades.filter(trade => trade.status !== 'planned');
    
    executedTrades.forEach(trade => {
      let assetType = 'Other';
      
      if (trade.symbol.includes('/')) {
        if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) {
          assetType = 'Crypto';
        } else {
          assetType = 'Forex';
        }
      } else {
        assetType = 'Stocks';
      }
      
      distribution[assetType] = (distribution[assetType] || 0) + 1;
    });
    
    return Object.keys(distribution).map(key => ({
      name: key,
      value: distribution[key]
    }));
  };
  
  // Generate profit/loss by month data
  const getProfitLossByMonth = () => {
    const monthlyData: {[key: string]: {profit: number, loss: number}} = {};
    
    trades
      .filter(trade => trade.status === 'closed' && trade.exit_date)
      .forEach(trade => {
        const date = new Date(trade.exit_date!);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[month]) {
          monthlyData[month] = { profit: 0, loss: 0 };
        }
        
        if (trade.profit_loss && trade.profit_loss > 0) {
          monthlyData[month].profit += trade.profit_loss;
        } else if (trade.profit_loss && trade.profit_loss < 0) {
          monthlyData[month].loss += Math.abs(trade.profit_loss);
        }
      });
    
    // Convert to array and sort by month
    return Object.keys(monthlyData)
      .sort()
      .map(month => {
        const [year, monthNum] = month.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        return {
          month: `${monthNames[parseInt(monthNum) - 1]} ${year}`,
          profit: monthlyData[month].profit,
          loss: monthlyData[month].loss
        };
      });
  };

  if (loading) {
    return (
      <Center style={{ height: 'calc(100vh - 60px)' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  const journalTitle = selectedJournal ? (
    <Group>
      <Title order={1}>Trading Journal</Title>
      <Badge 
        color={selectedJournal.is_active ? 'green' : 'gray'} 
        size="lg" 
        variant="filled"
      >
        {selectedJournal.name}
      </Badge>
    </Group>
  ) : (
    <Title order={1}>Trading Journal</Title>
  );
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="apart">
          {journalTitle}
          <Group>
            <Tooltip label="Refresh Data">
              <ActionIcon variant="light" onClick={fetchData}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>
            <TradeDrawerButton 
              mode="add" 
              onSuccess={fetchData} 
              journalId={selectedJournalId} 
            />
          </Group>
        </Group>

        <TradeStatsDisplay stats={stats} formatCurrency={formatCurrency} />
        
        {!viewTrade && (
          <>   
            <Grid gutter="md">
              {/* Equity Curve Chart */}
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Title order={3} mb="md">Equity Curve</Title>
                  <Box h={250}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={getEquityCurveData()}
                        margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                          tick={{ fontSize: 10 }}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="equity" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.3} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid.Col>
              
              {/* Trade Distribution Pie Chart */}
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                  <Title order={3} mb="md">Asset Distribution</Title>
                  <Box h={250}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getAssetDistribution()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {getAssetDistribution().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid.Col>
              
              {/* Monthly Profit/Loss Chart */}
              <Grid.Col span={12}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Title order={3} mb="md">Monthly Performance</Title>
                  <Box h={250}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getProfitLossByMonth()}
                        margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 10 }} 
                          angle={-45} 
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis 
                          tickFormatter={(value) => formatCurrency(value)}
                          tick={{ fontSize: 10 }}
                        />
                        <RechartsTooltip 
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                        <Bar dataKey="loss" fill="#ff8042" name="Loss" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Card>
              </Grid.Col>
              
              {/* Recent Trades */}
              <Grid.Col span={12}>
                <Card shadow="sm" padding="lg" radius="md" withBorder>
                  <Group justify="apart" mb="md">
                    <Title order={3}>Recent Trades</Title>
                    <Badge>Last {recentTrades.length} trades</Badge>
                  </Group>
                  
                  <Table striped highlightOnHover withTableBorder>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Symbol</Table.Th>
                        <Table.Th>Direction</Table.Th>
                        <Table.Th>Entry Date</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>P/L</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {recentTrades.map((trade) => (
                        <Table.Tr 
                          key={trade.id}
                          style={{ cursor: 'pointer' }} 
                          onClick={() => handleViewTrade(trade)}
                        >
                          <Table.Td>{trade.symbol}</Table.Td>
                          <Table.Td>
                            <Badge color={trade.direction === 'long' ? 'green' : 'red'}>
                              {(trade.direction || '').toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{new Date(trade.entry_date).toLocaleDateString()}</Table.Td>
                          <Table.Td>
                            <Badge color={trade.status === 'open' ? 'blue' : 'green'}>
                              {trade.status.toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            {trade.profit_loss !== undefined ? (
                              <Group gap={4}>
                                {trade.profit_loss >= 0 ? (
                                  <IconTrendingUp size={16} color="green" />
                                ) : (
                                  <IconTrendingDown size={16} color="red" />
                                )}
                                <Text c={trade.profit_loss >= 0 ? 'green' : 'red'} fw={700}>
                                  {formatCurrency(trade.profit_loss)}
                                </Text>
                              </Group>
                            ) : (
                              '-'
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Card>
              </Grid.Col>
            </Grid>
          </>
        )}

        {viewTrade ? (
          <TradeView 
            trade={viewTrade}
            onBack={handleBackFromView}
            onEdit={() => fetchData()}
          />
        ) : (
          <Paper p="md" shadow="xs" radius="md">
            <Group justify="apart" mb="md">
              <Title order={2}>All Trades</Title>
            </Group>
            <TradeList 
              onViewTrade={handleViewTrade}
              journalId={selectedJournalId}
              onTradeUpdated={fetchData}
            />
          </Paper>
        )}
      </Stack>
    </Container>
  );
}