// src/contexts/SupabaseContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { supabase, Trade, NewTrade } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Journal, NewJournal, UserSettings, TradeIndicator } from '../lib/types';

type SupabaseContextType = {
  getTrades: (journalId?: number | null) => Promise<Trade[]>;
  addTrade: (trade: NewTrade) => Promise<Trade | null>;
  updateTrade: (id: number, trade: Partial<Trade>) => Promise<Trade | null>;
  deleteTrade: (id: number) => Promise<void>;
  getTradeStats: (journalId?: number | null) => Promise<TradeStats | null>;
  getJournals: () => Promise<Journal[]>;
  getJournal: (id: number) => Promise<Journal | null>;
  addJournal: (journal: NewJournal) => Promise<Journal | null>;
  updateJournal: (id: number, journal: Partial<Journal>) => Promise<Journal | null>;
  deleteJournal: (id: number) => Promise<void>;
  getJournalStats: (journalId: number) => Promise<TradeStats | null>;
  getUserSettings: () => Promise<UserSettings | null>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<UserSettings | null>;
  getTradeIndicators: (tradeId: number) => Promise<TradeIndicator[]>;
  addTradeIndicator: (indicator: { trade_id: number; indicator_name: string }) => Promise<TradeIndicator | null>;
  deleteTradeIndicator: (id: number) => Promise<void>;
};

export interface TradeStats {
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  total_profit_loss: number;
  average_profit_loss: number;
  largest_win: number;
  largest_loss: number;
  open_trades: number;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Function to get all trades, optionally filtered by journal
  const getTrades = async (journalId?: number | null): Promise<Trade[]> => {
    if (!user) return [];

    let query = supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false });
    
    // Apply journal filter if specified
    if (journalId) {
      query = query.eq('journal_id', journalId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trades:', error);
      return [];
    }

    return data as Trade[];
  };

  // Function to get trade statistics, optionally filtered by journal
    const getTradeStats = async (journalId?: number | null): Promise<TradeStats | null> => {
  if (!user) return null;

  try {
    let { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (journalId) {
      data = data?.filter(trade => trade.journal_id === journalId) || [];
    }

    if (error) {
      console.error('Error fetching trades for stats:', error);
      return null;
    }

    if (!data || !Array.isArray(data)) {
      return null;
    }

    // Calculate statistics from raw trade data
    const closedTrades = data.filter(trade => trade.status === 'closed');
    const openTrades = data.filter(trade => trade.status === 'open');
    
    const winningTrades = closedTrades.filter(trade => 
      trade.profit_loss !== null && trade.profit_loss > 0
    );
    
    const losingTrades = closedTrades.filter(trade => 
      trade.profit_loss !== null && trade.profit_loss < 0
    );
    
    const breakEvenTrades = closedTrades.filter(trade => 
      trade.profit_loss !== null && trade.profit_loss === 0
    );

    const totalProfitLoss = closedTrades.reduce((sum, trade) => 
      sum + (trade.profit_loss || 0), 0
    );
    
    const stats: TradeStats = {
      total_trades: closedTrades.length + openTrades.length,
      winning_trades: winningTrades.length,
      losing_trades: losingTrades.length,
      win_rate: closedTrades.length > 0 
        ? (winningTrades.length / closedTrades.length) * 100 
        : 0,
      total_profit_loss: totalProfitLoss,
      average_profit_loss: closedTrades.length > 0 
        ? totalProfitLoss / closedTrades.length 
        : 0,
      largest_win: winningTrades.length > 0 
        ? Math.max(...winningTrades.map(trade => trade.profit_loss || 0)) 
        : 0,
      largest_loss: losingTrades.length > 0 
        ? Math.min(...losingTrades.map(trade => trade.profit_loss || 0)) 
        : 0,
      open_trades: openTrades.length
    };

    return stats;
  } catch (error) {
    console.error('Error calculating trade stats:', error);
    return null;
  }
};

  // Function to get journal-specific trade statistics
  const getJournalStats = async (journalId: number): Promise<TradeStats | null> => {
    return getTradeStats(journalId);
  };

  // Function to add a new trade
  const addTrade = async (trade: NewTrade): Promise<Trade | null> => {
    if (!user) return null;

    // Calculate profit/loss if it's a closed trade
    let profitLoss: number | undefined;
    let profitLossPercent: number | undefined;

    if (trade.status === 'closed' && trade.exit_price) {
      if (trade.direction === 'long') {
        profitLoss = (trade.exit_price - trade.entry_price) * trade.quantity;
        profitLossPercent = ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
      } else {
        profitLoss = (trade.entry_price - trade.exit_price) * trade.quantity;
        profitLossPercent = ((trade.entry_price - trade.exit_price) / trade.entry_price) * 100;
      }
    }

    const { data, error } = await supabase
      .from('trades')
      .insert([
        { 
          ...trade, 
          user_id: user.id,
          profit_loss: profitLoss, 
          profit_loss_percent: profitLossPercent 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error adding trade:', error);
      return null;
    }

    return data as Trade;
  };

  // Function to update a trade
  const updateTrade = async (id: number, trade: Partial<Trade>): Promise<Trade | null> => {
    if (!user) return null;
    
    // If we're updating prices, recalculate profit/loss
    const updates: Partial<Trade> = { ...trade };
    
    if (
      (trade.exit_price || trade.entry_price || trade.quantity || trade.direction) &&
      (trade.status === 'closed' || updates.status === 'closed')
    ) {
      // We need to get the current trade data first
      const { data: currentTrade } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();

      if (currentTrade) {
        const entryPrice = trade.entry_price || currentTrade.entry_price;
        const exitPrice = trade.exit_price || currentTrade.exit_price;
        const quantity = trade.quantity || currentTrade.quantity;
        const direction = trade.direction || currentTrade.direction;

        if (exitPrice) {
          if (direction === 'long') {
            updates.profit_loss = (exitPrice - entryPrice) * quantity;
            updates.profit_loss_percent = ((exitPrice - entryPrice) / entryPrice) * 100;
          } else {
            updates.profit_loss = (entryPrice - exitPrice) * quantity;
            updates.profit_loss_percent = ((entryPrice - exitPrice) / entryPrice) * 100;
          }
        }
      }
    }

    const { data, error } = await supabase
      .from('trades')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade:', error);
      return null;
    }

    return data as Trade;
  };

  // Function to delete a trade
  const deleteTrade = async (id: number): Promise<void> => {
    if (!user) return;
    
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trade:', error);
    }
  };

  // Function to get all journals
  const getJournals = async (): Promise<Journal[]> => {
  if (!user) {
    console.warn('Attempted to get journals without a user');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('user_id', user.id) // Add explicit user_id filter
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching journals:', error);
      return [];
    }

    if (!data) {
      console.warn('No journal data returned');
      return [];
    }

    return data as Journal[];
  } catch (error) {
    console.error('Exception while fetching journals:', error);
    return [];
  }
};

  // Function to get a specific journal
  const getJournal = async (id: number): Promise<Journal | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching journal:', error);
      return null;
    }

    return data as Journal;
  };

  // Function to add a new journal
  const addJournal = async (journal: NewJournal): Promise<Journal | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('journals')
      .insert([{ ...journal, user_id: user.id }])
      .select()
      .single();

    if (error) {
      console.error('Error adding journal:', error);
      return null;
    }

    return data as Journal;
  };

  // Function to update a journal
  const updateJournal = async (id: number, journal: Partial<Journal>): Promise<Journal | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('journals')
      .update(journal)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating journal:', error);
      return null;
    }

    return data as Journal;
  };

  // Function to delete a journal
  const deleteJournal = async (id: number): Promise<void> => {
    if (!user) return;
    
    const { error } = await supabase
      .from('journals')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting journal:', error);
    }
  };

  // Function to get user settings
  const getUserSettings = async (): Promise<UserSettings | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default settings
        const defaultSettings: Omit<UserSettings, 'id'> = {
          user_id: user.id,
          enable_registration: true,
          custom_symbols: [],
          custom_asset_classes: [],
          default_asset_classes: {
            forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'],
            crypto: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'LTC/USD', 'BCH/USD'],
            stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
          },
          custom_indicators: [],
          default_indicators: ['RSI', 'MACD', 'Moving Average', 'Bollinger Bands']
        };

        const { data: newSettings, error: createError } = await supabase
          .from('user_settings')
          .insert([defaultSettings])
          .select()
          .single();

        if (createError) {
          console.error('Error creating default user settings:', createError);
          return null;
        }

        return newSettings as UserSettings;
      } else {
        console.error('Error fetching user settings:', error);
        return null;
      }
    }

    return data as UserSettings;
  };

  // Function to update user settings
  const updateUserSettings = async (settings: Partial<UserSettings>): Promise<UserSettings | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_settings')
      .update(settings)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating user settings:', error);
      return null;
    }

    return data as UserSettings;
  };

  // Function to get trade indicators
  const getTradeIndicators = async (tradeId: number): Promise<TradeIndicator[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('trade_indicators')
      .select('*')
      .eq('trade_id', tradeId);

    if (error) {
      console.error('Error fetching trade indicators:', error);
      return [];
    }

    return data as TradeIndicator[];
  };

  // Function to add a trade indicator
  const addTradeIndicator = async (indicator: { trade_id: number; indicator_name: string }): Promise<TradeIndicator | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trade_indicators')
      .insert([indicator])
      .select()
      .single();

    if (error) {
      console.error('Error adding trade indicator:', error);
      return null;
    }

    return data as TradeIndicator;
  };

  // Function to delete a trade indicator
  const deleteTradeIndicator = async (id: number): Promise<void> => {
    if (!user) return;
    
    const { error } = await supabase
      .from('trade_indicators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trade indicator:', error);
    }
  };

  const value = {
    getTrades,
    addTrade,
    updateTrade,
    deleteTrade,
    getTradeStats,
    getJournals,
    getJournal,
    addJournal,
    updateJournal,
    deleteJournal,
    getJournalStats,
    getUserSettings,
    updateUserSettings,
    getTradeIndicators,
    addTradeIndicator,
    deleteTradeIndicator
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

// Custom hook to use the Supabase context
export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}