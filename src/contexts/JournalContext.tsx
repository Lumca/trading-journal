// src/contexts/JournalContext.tsx
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Journal } from '../lib/types';
import { useAuth } from './AuthContext';
import { useSupabase } from './SupabaseContext';

interface JournalContextType {
  journals: Journal[];
  selectedJournalId: number | null;
  setSelectedJournalId: (id: number | null) => void;
  selectedJournal: Journal | null;
  loading: boolean;
  refetchJournals: () => Promise<void>;
}

// Create a default value for the context to avoid undefined issues
const defaultContextValue: JournalContextType = {
  journals: [],
  selectedJournalId: null,
  setSelectedJournalId: () => {},
  selectedJournal: null,
  loading: true,
  refetchJournals: async () => {}
};

const JournalContext = createContext<JournalContextType>(defaultContextValue);

export function JournalProvider({ children }: { children: ReactNode }) {
  // Initialize with empty array to prevent undefined
  const [journals, setJournals] = useState<Journal[]>([]);
  const [selectedJournalId, setSelectedJournalId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { getJournals } = useSupabase();
  const { user, loading: authLoading } = useAuth();

  // Wait for auth to be ready before fetching journals
  useEffect(() => {
    if (!authLoading && user) {
      fetchJournals();
    } else if (!authLoading && !user) {
      // If auth is ready but no user, clear journals
      setJournals([]);
      setLoading(false);
    }
  }, [authLoading, user]);

  // Create an interval to periodically check for updates (optional)
  useEffect(() => {
    if (!user) return; // Don't set up interval if no user
    
    const interval = setInterval(() => {
      fetchJournals(false); // Silent refresh
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [user]);

  const fetchJournals = async (showLoading = true) => {
    if (!user) {
      console.log("Attempting to fetch journals with no user");
      setJournals([]);
      setLoading(false);
      return;
    }
    
    if (showLoading) {
      setLoading(true);
    }
    
    try {
      const journalsData = await getJournals();
      
      if (Array.isArray(journalsData)) {
        setJournals(journalsData);
      } else {
        console.error("Unexpected journal data format:", journalsData);
        setJournals([]);
      }
    } catch (error) {
      console.error('Error fetching journals:', error);
      setJournals([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  // Find the selected journal object based on the ID
  // Ensure journals is an array before using find
  const selectedJournal = Array.isArray(journals) 
    ? journals.find(journal => journal.id === selectedJournalId) || null 
    : null;

  return (
    <JournalContext.Provider
      value={{
        journals: journals || [],  // Ensure journals is never undefined
        selectedJournalId,
        setSelectedJournalId,
        selectedJournal,
        loading: loading || authLoading, // Consider auth loading as part of journal loading
        refetchJournals: () => fetchJournals(true)
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) {
    throw new Error('useJournal must be used within a JournalProvider');
  }
  return context;
}