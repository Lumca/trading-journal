// src/components/JournalSelector.tsx
import { Select, Skeleton, Box } from '@mantine/core';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../contexts/JournalContext';

export function JournalSelector() {
  const { journals, selectedJournalId, setSelectedJournalId, loading } = useJournal();
  const { user } = useAuth();

  const handleJournalChange = (value: string | null) => {
    if (value === 'all') {
      setSelectedJournalId(null);
    } else if (value) {
      setSelectedJournalId(parseInt(value));
    }
  };

  // If not logged in or loading, show minimal UI
  if (!user) return null;
  if (loading) return <Skeleton height={36} width="100%" />;

  // Create a static array for the "All Journals" option
  const allOption = [{ value: 'all', label: 'All Journals' }];
  
  // Only process journals if it's a valid array
  const journalList = Array.isArray(journals) ? journals : [];
  
  // Create an array of journal options for active journals only
  const journalOptions = journalList
    .filter(journal => journal.is_active) // Filter out inactive journals
    .map(journal => ({
      value: String(journal.id),
      label: journal.name
    }));
  
  // Combine the options safely
  const selectData = [...allOption, ...journalOptions];

  // Simple value derived from selectedJournalId
  // Check if the selected journal is still in the list (it might have been made inactive)
  const isSelectedJournalActive = selectedJournalId ? 
    journalList.some(j => j.id === selectedJournalId && j.is_active) : 
    false;
  
  const selectValue = isSelectedJournalActive ? String(selectedJournalId) : 'all';

  return (
    <Box style={{ width: '100%' }}>
      <Select
        placeholder="Select Journal"
        data={selectData}
        value={selectValue}
        onChange={handleJournalChange}
        searchable
        clearable={false}
        size="sm"
        styles={(theme) => ({
          input: {
            fontSize: theme.fontSizes.sm,
          },
          item: {
            fontSize: theme.fontSizes.sm,
          },
        })}
      />
    </Box>
  );
}