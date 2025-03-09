// src/components/JournalForm.tsx
import { useState } from 'react';
import {
  TextInput,
  Button,
  Group,
  Stack,
  Textarea,
  Paper,
  Title,
  ActionIcon,
  Tooltip,
  Switch,
  Select
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useSupabase } from '../contexts/SupabaseContext';
import { Journal, NewJournal } from '../lib/types';
import { FaTimes } from 'react-icons/fa';

interface JournalFormProps {
  editJournal?: Journal;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalForm({ editJournal, onSuccess, onCancel }: JournalFormProps) {
  const { addJournal, updateJournal } = useSupabase();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: editJournal?.name || '',
      description: editJournal?.description || '',
      is_active: editJournal?.is_active ?? true,
      base_currency: editJournal?.base_currency || 'USD',
      tags: editJournal?.tags?.join(', ') || '',
    },
    validate: {
      name: (value) => (value.trim() ? null : 'Journal name is required'),
      base_currency: (value) => (value.trim() ? null : 'Base currency is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const journalData: NewJournal = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        is_active: values.is_active,
        base_currency: values.base_currency,
        tags: values.tags ? values.tags.split(',').map(tag => tag.trim()) : undefined,
      };

      if (editJournal) {
        await updateJournal(editJournal.id, journalData);
      } else {
        await addJournal(journalData);
      }

      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error saving journal:', error);
    } finally {
      setLoading(false);
    }
  };

  const currencyOptions = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'HKD', label: 'HKD - Hong Kong Dollar' },
    { value: 'NZD', label: 'NZD - New Zealand Dollar' },
  ];

  return (
    <Paper p="md" shadow="xs" radius="md">
      <Group position="apart" mb="md">
        <Title order={3}>{editJournal ? 'Edit Journal' : 'Create New Journal'}</Title>
        <Tooltip label="Close">
          <ActionIcon onClick={onCancel} variant="subtle">
            <FaTimes />
          </ActionIcon>
        </Tooltip>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack spacing="md">
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

          <Select
            required
            label="Base Currency"
            placeholder="Select base currency"
            data={currencyOptions}
            searchable
            {...form.getInputProps('base_currency')}
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

          <Group position="right" mt="md">
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