// src/components/JournalForm.tsx
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  Textarea,
  TextInput,
  Title,
  Tooltip
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';
import { useJournal } from '../contexts/JournalContext';
import { useSupabase } from '../contexts/SupabaseContext';
import { Journal, NewJournal } from '../lib/types';

interface JournalFormProps {
  editJournal?: Journal;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalForm({ editJournal, onSuccess, onCancel }: JournalFormProps) {
  const { addJournal, updateJournal } = useSupabase();
  const { refetchJournals } = useJournal();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: editJournal?.name || '',
      description: editJournal?.description || '',
      is_active: editJournal?.is_active ?? true,
      tags: editJournal?.tags?.join(', ') || '',
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Journal name is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const journalData: NewJournal = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        is_active: values.is_active,
        base_currency: 'USD', // Hardcoded to USD since we're removing the selection
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()) : undefined,
      };

      if (editJournal) {
        await updateJournal(editJournal.id, journalData);
      } else {
        await addJournal(journalData);
      }

      // Refresh journals in context
      await refetchJournals();
      
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error saving journal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper p="md" shadow="xs" radius="md">
      <Group mb="md">
        <Title order={3}>{editJournal ? 'Edit Journal' : 'Create New Journal'}</Title>
        <Tooltip label="Close">
          <ActionIcon onClick={onCancel} variant="subtle">
            <FaTimes />
          </ActionIcon>
        </Tooltip>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Journal Name"
            placeholder="My Forex Trading Journal"
            {...form.getInputProps('name')}
          />

          <Textarea
            label="Description"
            placeholder="Details about this journal..."
            {...form.getInputProps('description')}
          />

          <TextInput
            label="Tags"
            placeholder="forex, swing-trading, daily"
            {...form.getInputProps('tags')}
            description="Separate tags with commas"
          />

          <Switch
            label="Active Journal"
            checked={form.values.is_active}
            onChange={(event) => form.setFieldValue('is_active', event.currentTarget.checked)}
            description="Inactive journals can be archived without deletion"
          />

          <Group justify="right" mt="md">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {editJournal ? 'Update Journal' : 'Create Journal'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Paper>
  );
}