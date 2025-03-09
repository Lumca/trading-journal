// src/components/JournalSelector.tsx
import { Select, Skeleton } from '@mantine/core';
import { useJournal } from '../contexts/JournalContext';
import { useAuth } from '../contexts/AuthContext';

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
  if (loading) return <Skeleton height={36} width={200} />;

  // Create a static array for the "All Journals" option
  const allOption = [{ value: 'all', label: 'All Journals' }];
  
  // Only process journals if it's a valid array
  const journalList = Array.isArray(journals) ? journals : [];
  
  // Create an array of journal options if journals is valid
  const journalOptions = journalList.length > 0 
    ? journalList.map(journal => ({
        value: String(journal.id),
        label: journal.name
      })) 
    : [];
  
  // Combine the options safely
  const selectData = [...allOption, ...journalOptions];

  // Simple value derived from selectedJournalId
  const selectValue = selectedJournalId ? String(selectedJournalId) : 'all';

  return (
    <Select
      placeholder="Select Journal"
      data={selectData}
      value={selectValue}
      onChange={handleJournalChange}
      searchable
      clearable={false}
    />
  );
}