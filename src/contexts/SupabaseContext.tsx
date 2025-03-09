// src/contexts/SupabaseContext.tsx
import { createContext, useContext, ReactNode } from 'react';
import { supabase, Trade, NewTrade } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Journal, NewJournal, TradeIndicator, UserSettings } from '../lib/types';

type SupabaseContextType = {
  // Trade related methods
  getTrades: () => Promise<Trade[]>;
  getTradesByJournal: (journalId: number) => Promise<Trade[]>;
  addTrade: (trade: NewTrade) => Promise<Trade | null>;
  updateTrade: (id: number, trade: Partial<Trade>) => Promise<Trade | null>;
  deleteTrade: (id: number) => Promise<void>;
  getTradeStats: () => Promise<TradeStats | null>;
  
  // Journal related methods
  getJournals: () => Promise<Journal[]>;
  getJournal: (id: number) => Promise<Journal | null>;
  addJournal: (journal: NewJournal) => Promise<Journal | null>;
  updateJournal: (id: number, journal: Partial<Journal>) => Promise<Journal | null>;
  deleteJournal: (id: number) => Promise<void>;
  getJournalStats: (journalId: number) => Promise<JournalStats | null>;
  
  // User settings related methods
  getUserSettings: () => Promise<UserSettings | null>;
  updateUserSettings: (settings: Partial<UserSettings>) => Promise<UserSettings | null>;
  
  // Trade indicators related methods
  getTradeIndicators: (tradeId: number) => Promise<TradeIndicator[]>;
  addTradeIndicator: (data: { trade_id: number, indicator_name: string, notes?: string }) => Promise<TradeIndicator | null>;
  updateTradeIndicator: (id: number, data: Partial<TradeIndicator>) => Promise<TradeIndicator | null>;
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

export interface JournalStats {
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

  // Function to get all trades
  const getTrades = async (): Promise<Trade[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error);
      return [];
    }

    return data as Trade[];
  };

  // Function to get trades by journal
  const getTradesByJournal = async (journalId: number): Promise<Trade[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('journal_id', journalId)
      .order('entry_date', { ascending: false });

    if (error) {
      console.error('Error fetching trades by journal:', error);
      return [];
    }

    return data as Trade[];
  };

  // Function to get trade statistics
  const getTradeStats = async (): Promise<TradeStats | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .rpc('get_trade_stats', { user_id_param: user.id })
      .single();

    if (error) {
      console.error('Error fetching trade stats:', error);
      return null;
    }

    return data as TradeStats;
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
    let updates: Partial<Trade> = { ...trade };
    
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
    if (!user) return [];

    const { data, error } = await supabase
      .from('journals')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching journals:', error);
      return [];
    }

    return data as Journal[];
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
      .insert([
        { 
          ...journal, 
          user_id: user.id
        }
      ])
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

  // Function to get journal statistics
  const getJournalStats = async (journalId: number): Promise<JournalStats | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .rpc('get_journal_stats', { 
        journal_id_param: journalId,
        user_id_param: user.id 
      })
      .single();

    if (error) {
      console.error('Error fetching journal stats:', error);
      return null;
    }

    return data as JournalStats;
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
        const defaultSettings: Partial<UserSettings> = {
          enable_registration: true,
          custom_symbols: [],
          custom_asset_classes: [],
          default_asset_classes: {
            forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'USD/CAD', 'AUD/USD'],
            crypto: ['BTC/USD', 'ETH/USD', 'XRP/USD', 'LTC/USD'],
            stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
          },
          custom_indicators: [],
          default_indicators: ['RSI', 'MACD', 'Moving Average', 'Bollinger Bands']
        };
        
        return await updateUserSettings(defaultSettings);
      }
      
      console.error('Error fetching user settings:', error);
      return null;
    }

    return data as UserSettings;
  };

  // Function to update user settings
  const updateUserSettings = async (settings: Partial<UserSettings>): Promise<UserSettings | null> => {
    if (!user) return null;

    // Check if settings exist
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    
    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from('user_settings')
        .update(settings)
        .eq('id', existingSettings.id)
        .select()
        .single();
    } else {
      // Insert new settings
      result = await supabase
        .from('user_settings')
        .insert([{ ...settings, user_id: user.id }])
        .select()
        .single();
    }

    if (result.error) {
      console.error('Error updating user settings:', result.error);
      return null;
    }

    return result.data as UserSettings;
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
  const addTradeIndicator = async (data: { trade_id: number, indicator_name: string, notes?: string }): Promise<TradeIndicator | null> => {
    if (!user) return null;

    const { data: result, error } = await supabase
      .from('trade_indicators')
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error('Error adding trade indicator:', error);
      return null;
    }

    return result as TradeIndicator;
  };

  // Function to update a trade indicator
  const updateTradeIndicator = async (id: number, data: Partial<TradeIndicator>): Promise<TradeIndicator | null> => {
    if (!user) return null;

    const { data: result, error } = await supabase
      .from('trade_indicators')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade indicator:', error);
      return null;
    }

    return result as TradeIndicator;
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
    // Trade methods
    getTrades,
    getTradesByJournal,
    addTrade,
    updateTrade,
    deleteTrade,
    getTradeStats,
    
    // Journal methods
    getJournals,
    getJournal,
    addJournal,
    updateJournal,
    deleteJournal,
    getJournalStats,
    
    // User settings methods
    getUserSettings,
    updateUserSettings,
    
    // Trade indicators methods
    getTradeIndicators,
    addTradeIndicator,
    updateTradeIndicator,
    deleteTradeIndicator,
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