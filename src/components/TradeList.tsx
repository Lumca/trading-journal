// src/components/TradeList.tsx - Updated with pagination and date filtering
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Pagination,
  Paper,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip,
  Stack,
  Grid
} from '@mantine/core';
import { DateInput, DatePickerInput } from '@mantine/dates';
import { IconCalendar, IconFilter, IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { FaEye, FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useJournal } from '../contexts/JournalContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';
import { TradeDrawerButton } from './TradeDrawerButton';

interface TradeListProps {
  onViewTrade?: (trade: Trade) => void;
  journalId?: number | null;
  onTradeUpdated?: () => void;
}

export function TradeList({ onViewTrade, journalId, onTradeUpdated }: TradeListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [displayedTrades, setDisplayedTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [singleDate, setSingleDate] = useState<Date | null>(null);
  const [dateFilterType, setDateFilterType] = useState<'range' | 'single'>('range');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  
  const { getTrades, deleteTrade } = useSupabase();
  const { selectedJournal } = useJournal();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrades();
  }, [journalId]);

  // Apply filters whenever filter criteria change
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, dateRange, singleDate, dateFilterType, trades]);
  
  // Update displayed trades whenever filtered trades or pagination changes
  useEffect(() => {
    updateDisplayedTrades();
  }, [filteredTrades, currentPage, itemsPerPage]);

  const fetchTrades = async () => {
    setLoading(true);
    const tradesData = await getTrades(journalId);
    setTrades(tradesData);
    setFilteredTrades(tradesData);
    
    // Calculate total pages
    setTotalPages(Math.ceil(tradesData.length / itemsPerPage));
    
    setLoading(false);
  };

  // Function to apply all filters
  const applyFilters = () => {
    let result = trades;
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(trade => trade.status === statusFilter);
    }
    
    // Apply date filter
    if (dateFilterType === 'range' && dateRange[0] && dateRange[1]) {
      const startDate = new Date(dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);
      
      result = result.filter(trade => {
        const entryDate = new Date(trade.entry_date);
        return entryDate >= startDate && entryDate <= endDate;
      });
    } else if (dateFilterType === 'single' && singleDate) {
      const targetDate = new Date(singleDate);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      result = result.filter(trade => {
        const entryDate = new Date(trade.entry_date);
        return entryDate >= targetDate && entryDate < nextDay;
      });
    }
    
    // Apply search filter (case insensitive)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(trade => 
        trade.symbol.toLowerCase().includes(term) || 
        trade.strategy?.toLowerCase().includes(term) ||
        trade.tags?.some(tag => tag.toLowerCase().includes(term)) ||
        trade.notes?.toLowerCase().includes(term)
      );
    }
    
    setFilteredTrades(result);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Update total pages
    setTotalPages(Math.ceil(result.length / itemsPerPage));
  };
  
  // Update displayed trades based on pagination
  const updateDisplayedTrades = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedTrades(filteredTrades.slice(startIndex, endIndex));
  };

  const handleDeleteTrade = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(id);
      fetchTrades();
      if (onTradeUpdated) {
        onTradeUpdated();
      }
    }
  };

  // Calculate net profit/loss (with fees)
  const calculateNetPL = (trade: Trade) => {
    if (trade.status !== 'closed' || trade.profit_loss === undefined) return null;
    
    const grossPL = trade.profit_loss;
    const fees = trade.fees || 0;
    
    // If the profit_loss_percent seems off (not matching the actual net P/L),
    // it's likely an older trade that didn't account for fees correctly
    const expectedPercent = trade.entry_price && trade.quantity ? 
      ((grossPL - fees) / (trade.entry_price * trade.quantity)) * 100 : 0;
    
    const percentDifference = Math.abs((expectedPercent - (trade.profit_loss_percent || 0)));
    
    // If there's a significant difference, recalculate with fees
    if (percentDifference > 0.1) {
      return grossPL - fees;
    }
    
    // Otherwise, just return the profit_loss as it should already include fees
    return grossPL;
  };

  const formatCurrency = (value: number) => {
    const currencyCode = selectedJournal?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
    }).format(value);
  };

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter(null);
    setDateRange([null, null]);
    setSingleDate(null);
    setDateFilterType('range');
    setCurrentPage(1);
  };

  // Handler for page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // Handler for items per page change
  const handleItemsPerPageChange = (value: string | null) => {
    if (value) {
      setItemsPerPage(parseInt(value));
      setCurrentPage(1); // Reset to first page when changing items per page
    }
  };
  
  // Toggle between date range and single date
  const toggleDateFilterType = () => {
    setDateFilterType(prev => prev === 'range' ? 'single' : 'range');
    setDateRange([null, null]);
    setSingleDate(null);
  };

  if (loading) {
    return (
      <Center p="xl">
        <Loader size="md" />
      </Center>
    );
  }

  if (trades.length === 0) {
    return (
      <Box py="xl" ta="center">
        <Text size="lg" fw={500} c="dimmed">No trades found.</Text>
        <Text>Add your first trade to get started!</Text>
      </Box>
    );
  }

  return (
    <Stack spacing="md">
      {/* Filters */}
      <Paper p="md" radius="md" withBorder>
        <Stack spacing="md">
          <Text fw={500}>Filters</Text>
          
          <Grid>
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <TextInput
                placeholder="Search trades..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
              />
            </Grid.Col>
            
            <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                data={[
                  { value: 'planned', label: 'Planned Trades' },
                  { value: 'open', label: 'Open Trades' },
                  { value: 'closed', label: 'Closed Trades' }
                ]}
                clearable
                leftSection={<IconFilter size={16} />}
              />
            </Grid.Col>
            
            
<Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
  {dateFilterType === 'range' ? (
    <DatePickerInput
      type="range"
      placeholder="Filter by date range"
      value={dateRange}
      onChange={setDateRange}
      leftSection={<IconCalendar size={16} />}
      rightSection={
        <Tooltip label="Switch to single date">
          <ActionIcon onClick={toggleDateFilterType} variant="subtle">
            <IconCalendar size={16} />
          </ActionIcon>
        </Tooltip>
      }
      clearable
    />
  ) : (
    <DateInput
      placeholder="Filter by specific date"
      value={singleDate}
      onChange={setSingleDate}
      leftSection={<IconCalendar size={16} />}
      rightSection={
        <Tooltip label="Switch to date range">
          <ActionIcon onClick={toggleDateFilterType} variant="subtle">
            <IconCalendar size={16} />
          </ActionIcon>
        </Tooltip>
      }
      clearable
    />
  )}
</Grid.Col>
          </Grid>
          
          <Group position="apart">
            <Text size="sm">
              Showing {filteredTrades.length} of {trades.length} trades
            </Text>
            
            <Group>
              <Select
                label="Items per page"
                value={String(itemsPerPage)}
                onChange={handleItemsPerPageChange}
                data={[
                  { value: '5', label: '5' },
                  { value: '10', label: '10' },
                  { value: '25', label: '25' },
                  { value: '50', label: '50' },
                  { value: '100', label: '100' }
                ]}
                style={{ width: 80 }}
                size="xs"
              />
              
              <ActionIcon 
                variant="light" 
                color="blue" 
                onClick={resetFilters}
                disabled={!searchTerm && !statusFilter && !dateRange[0] && !singleDate}
              >
                <IconFilter size={16} />
              </ActionIcon>
            </Group>
          </Group>
        </Stack>
      </Paper>

      {/* Trade Table */}
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Symbol</Table.Th>
            <Table.Th>Direction</Table.Th>
            <Table.Th>Entry Date</Table.Th>
            <Table.Th>Entry Price</Table.Th>
            <Table.Th>Quantity</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Fees</Table.Th>
            <Table.Th>P/L</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {displayedTrades.map((trade) => {
            const netPL = calculateNetPL(trade);
            
            return (
              <Table.Tr 
                key={trade.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/trades/${trade.id}`)}
              >
                <Table.Td>{trade.symbol}</Table.Td>
                <Table.Td>
                  <Badge color={trade.direction === 'long' ? 'green' : 'red'}>
                    {(trade.direction || '').toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>{new Date(trade.entry_date).toLocaleDateString()}</Table.Td>
                <Table.Td>{formatCurrency(trade.entry_price)}</Table.Td>
                <Table.Td>{trade.quantity}</Table.Td>
                <Table.Td>
                  <Badge color={
                    trade.status === 'open' ? 'blue' : 
                    trade.status === 'planned' ? 'yellow' : 
                    'green'
                  }>
                    {trade.status === 'planned' ? 'PLANNED' : trade.status.toUpperCase()}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {trade.fees ? (
                    <Text c="red">
                      {formatCurrency(trade.fees)}
                    </Text>
                  ) : (
                    '-'
                  )}
                </Table.Td>
                <Table.Td>
                  {trade.status === 'planned' ? (
                    <Text c="dimmed" fs="italic">Planned</Text>
                  ) : netPL !== null ? (
                    <Text c={netPL >= 0 ? 'green' : 'red'} fw={700}>
                      {formatCurrency(netPL)}
                    </Text>
                  ) : (
                    '-'
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="View Details">
                      <ActionIcon 
                        variant="subtle" 
                        color="gray" 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trades/${trade.id}`);
                        }}
                      >
                        <FaEye />
                      </ActionIcon>
                    </Tooltip>
                    <TradeDrawerButton
                      mode="edit"
                      trade={trade}
                      onSuccess={() => {
                        fetchTrades();
                        if (onTradeUpdated) onTradeUpdated();
                      }}
                      size="sm"
                      iconOnly
                    />
                    <Tooltip label="Delete">
                      <ActionIcon 
                        variant="subtle" 
                        color="red" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTrade(trade.id);
                        }}
                      >
                        <FaTrash />
                      </ActionIcon>
                    </Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Group position="center" mt="md">
          <Pagination 
            total={totalPages} 
            value={currentPage}
            onChange={handlePageChange}
            withEdges
          />
        </Group>
      )}
    </Stack>
  );
}