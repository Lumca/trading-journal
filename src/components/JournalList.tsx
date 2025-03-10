// src/components/JournalList.tsx
import { ActionIcon, Badge, Box, Group, Table, Text, Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { useSupabase } from '../contexts/SupabaseContext';
import { Journal } from '../lib/types';

interface JournalListProps {
  onEditJournal: (journal: Journal) => void;
  onSelectJournal: (journal: Journal) => void;
}

export function JournalList({ onEditJournal, onSelectJournal }: JournalListProps) {
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const { getJournals, deleteJournal } = useSupabase();

  useEffect(() => {
    fetchJournals();
  }, []);

  const fetchJournals = async () => {
    setLoading(true);
    try {
      const journalsData = await getJournals();
      // Ensure journals is always an array
      setJournals(Array.isArray(journalsData) ? journalsData : []);
    } catch (error) {
      console.error('Error fetching journals:', error);
      setJournals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteJournal = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this journal? This will not delete the trades, but they will no longer be associated with this journal.')) {
      await deleteJournal(id);
      fetchJournals();
    }
  };

  if (loading) {
    return <Text>Loading journals...</Text>;
  }

  if (journals.length === 0) {
    return (
      <Box py="xl" ta="center">
        <Text>No journals found. Create your first journal!</Text>
      </Box>
    );
  }

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Name</Table.Th>
          <Table.Th>Description</Table.Th>
          <Table.Th>Currency</Table.Th>
          <Table.Th>Status</Table.Th>
          <Table.Th>Actions</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {journals.map((journal) => (
          <Table.Tr key={journal.id} style={{ cursor: 'pointer' }} onClick={() => onSelectJournal(journal)}>
            <Table.Td>{journal.name}</Table.Td>
            <Table.Td>{journal.description || '-'}</Table.Td>
            <Table.Td>{journal.base_currency}</Table.Td>
            <Table.Td>
              <Badge color={journal.is_active ? 'green' : 'gray'}>
                {journal.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </Table.Td>
            <Table.Td>
              <Group gap="xs">
                <Tooltip label="Edit">
                  <ActionIcon 
                    variant="subtle" 
                    color="blue" 
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditJournal(journal);
                    }}
                  >
                    <FaEdit />
                  </ActionIcon>
                </Tooltip>
                <Tooltip label="Delete">
                  <ActionIcon 
                    variant="subtle" 
                    color="red" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteJournal(journal.id);
                    }}
                  >
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