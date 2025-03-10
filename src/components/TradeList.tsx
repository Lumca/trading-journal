// src/components/TradeList.tsx
import {
  ActionIcon,
  Badge,
  Box,
  Center,
  Group,
  Loader,
  Select,
  Table,
  Text,
  TextInput,
  Tooltip
} from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { FaEye, FaTrash } from 'react-icons/fa';
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const { getTrades, deleteTrade } = useSupabase();
  const { selectedJournal } = useJournal();

  useEffect(() => {
    fetchTrades();
  }, [journalId]);

  const fetchTrades = async () => {
    setLoading(true);
    const tradesData = await getTrades(journalId);
    setTrades(tradesData);
    setFilteredTrades(tradesData);
    setLoading(false);
  };

  // Filter trades when search term or status filter changes
  useEffect(() => {
    let result = trades;
    
    // Apply status filter
    if (statusFilter) {
      result = result.filter(trade => trade.status === statusFilter);
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
  }, [searchTerm, statusFilter, trades]);

  const handleDeleteTrade = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(id);
      fetchTrades();
      if (onTradeUpdated) {
        onTradeUpdated();
      }
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

  if (trades.length === 0) {
    return (
      <Box py="xl" ta="center">
        <Text size="lg" fw={500} c="dimmed">No trades found.</Text>
        <Text>Add your first trade to get started!</Text>
      </Box>
    );
  }

  return (
    <Box>
      {/* Filters */}
      <Group justify="apart" mb="md">
        <TextInput
          placeholder="Search trades..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          style={{ maxWidth: 300 }}
        />
        <Select
          placeholder="Filter by status"
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { value: 'open', label: 'Open Trades' },
            { value: 'closed', label: 'Closed Trades' }
          ]}
          clearable
          style={{ width: 150 }}
        />
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Symbol</Table.Th>
            <Table.Th>Direction</Table.Th>
            <Table.Th>Entry Date</Table.Th>
            <Table.Th>Entry Price</Table.Th>
            <Table.Th>Quantity</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>P/L</Table.Th>
            <Table.Th>P/L %</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {filteredTrades.map((trade) => (
            <Table.Tr key={trade.id}>
              <Table.Td>{trade.symbol}</Table.Td>
              <Table.Td>
                <Badge color={trade.direction === 'long' ? 'green' : 'red'}>
                  {trade.direction.toUpperCase()}
                </Badge>
              </Table.Td>
              <Table.Td>{new Date(trade.entry_date).toLocaleDateString()}</Table.Td>
              <Table.Td>{formatCurrency(trade.entry_price)}</Table.Td>
              <Table.Td>{trade.quantity}</Table.Td>
              <Table.Td>
                <Badge color={trade.status === 'open' ? 'blue' : 'green'}>
                  {trade.status.toUpperCase()}
                </Badge>
              </Table.Td>
              <Table.Td>
                {trade.profit_loss !== undefined ? (
                  <Text c={trade.profit_loss >= 0 ? 'green' : 'red'} fw={700}>
                    {formatCurrency(trade.profit_loss)}
                  </Text>
                ) : (
                  '-'
                )}
              </Table.Td>
              <Table.Td>
                {trade.profit_loss_percent !== undefined ? (
                  <Text c={trade.profit_loss_percent >= 0 ? 'green' : 'red'} fw={700}>
                    {trade.profit_loss_percent?.toFixed(2)}%
                  </Text>
                ) : (
                  '-'
                )}
              </Table.Td>
              <Table.Td>
                <Group gap="xs">
                  {onViewTrade && (
                    <Tooltip label="View Details">
                      <ActionIcon variant="subtle" color="gray" onClick={() => onViewTrade(trade)}>
                        <FaEye />
                      </ActionIcon>
                    </Tooltip>
                  )}
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
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteTrade(trade.id)}>
                      <FaTrash />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}