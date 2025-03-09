// src/components/TradeList.tsx
import { useState, useEffect } from 'react';
import { Table, Group, Badge, Button, Text, ActionIcon, Tooltip } from '@mantine/core';
import { useSupabase } from '../contexts/SupabaseContext';
import { Trade } from '../lib/supabase';
import { IoMdOpen } from 'react-icons/io';
import { FaEdit, FaTrash } from 'react-icons/fa';

interface TradeListProps {
  onEditTrade: (trade: Trade) => void;
}

export function TradeList({ onEditTrade }: TradeListProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const { getTrades, deleteTrade } = useSupabase();

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    const tradesData = await getTrades();
    setTrades(tradesData);
    setLoading(false);
  };

  const handleDeleteTrade = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(id);
      fetchTrades();
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  if (loading) {
    return <Text>Loading trades...</Text>;
  }

  if (trades.length === 0) {
    return <Text>No trades found. Add your first trade!</Text>;
  }

  return (
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
        {trades.map((trade) => (
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
                  {trade.profit_loss_percent.toFixed(2)}%
                </Text>
              ) : (
                '-'
              )}
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon variant="subtle" color="blue" onClick={() => onEditTrade(trade)}>
                    <FaEdit />
                  </ActionIcon>
                </Tooltip>
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
  );
}