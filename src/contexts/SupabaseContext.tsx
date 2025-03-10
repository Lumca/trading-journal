// src/contexts/SupabaseContext.tsx
import { createContext, ReactNode, useContext } from 'react';
import { NewTrade, supabase, Trade } from '../lib/supabase';
import { Journal, NewJournal, TradeEntry, TradeEntryInput, TradeExit, TradeExitInput, TradeIndicator, UserSettings } from '../lib/types';
import { useAuth } from './AuthContext';

type SupabaseContextType = {
  getTrades: (journalId?: number | null) => Promise<Trade[]>;
  getTrade: (id: number) => Promise<Trade | null>;
  addTrade: (trade: NewTrade & { 
    entries?: TradeEntry[]; 
    exits?: TradeExit[]; 
  }) => Promise<Trade | null>;
  updateTrade: (id: number, trade: Partial<Trade> & { 
    entries?: TradeEntry[]; 
    exits?: TradeExit[]; 
  }) => Promise<Trade | null>;
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
  uploadTradeScreenshot: (tradeId: number, file: File) => Promise<{ id: string, url: string } | null>;
  deleteTradeScreenshot: (screenshotId: string) => Promise<boolean>;
  getTradeScreenshots: (tradeId: number) => Promise<any[]>;
  getTradeEntries: (tradeId: number) => Promise<TradeEntry[]>;
  addTradeEntry: (tradeId: number, entry: TradeEntryInput) => Promise<TradeEntry | null>;
  updateTradeEntry: (id: number, entry: Partial<TradeEntryInput>) => Promise<TradeEntry | null>;
  deleteTradeEntry: (id: number) => Promise<void>;
  getTradeExits: (tradeId: number) => Promise<TradeExit[]>;
  addTradeExit: (tradeId: number, exit: TradeExitInput) => Promise<TradeExit | null>;
  updateTradeExit: (id: number, exit: Partial<TradeExitInput>) => Promise<TradeExit | null>;
  deleteTradeExit: (id: number) => Promise<void>;
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

  // Get a single trade with all its details
  const getTrade = async (id: number): Promise<Trade | null> => {
    if (!user) return null;

    try {
      // First get the main trade data
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('*')
        .eq('id', id)
        .single();

      if (tradeError) {
        console.error('Error fetching trade:', tradeError);
        return null;
      }

      // Get entry points
      const { data: entriesData, error: entriesError } = await supabase
        .from('trade_entries')
        .select('*')
        .eq('trade_id', id)
        .order('date', { ascending: true });

      if (entriesError) {
        console.error('Error fetching trade entries:', entriesError);
      }

      // Get exit points
      const { data: exitsData, error: exitsError } = await supabase
        .from('trade_exits')
        .select('*')
        .eq('trade_id', id)
        .order('date', { ascending: true });

      if (exitsError) {
        console.error('Error fetching trade exits:', exitsError);
      }

      // Combine all data
      return {
        ...tradeData,
        entries: entriesData || [],
        exits: exitsData || []
      } as Trade;
    } catch (error) {
      console.error('Error in getTrade:', error);
      return null;
    }
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

  // Function to add a new trade with multiple entry/exit points
  const addTrade = async (trade: NewTrade & { 
    entries?: TradeEntry[]; 
    exits?: TradeExit[]; 
  }): Promise<Trade | null> => {
    if (!user) return null;

    // Start a transaction to ensure all operations succeed or fail together
    try {
      // Extract entries and exits from the trade object
      const { entries, exits, ...mainTradeData } = trade;
      
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

      // Insert the main trade record
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .insert([{ 
          ...mainTradeData, 
          user_id: user.id,
          profit_loss: profitLoss, 
          profit_loss_percent: profitLossPercent 
        }])
        .select()
        .single();

      if (tradeError) {
        console.error('Error adding trade:', tradeError);
        return null;
      }

      const tradeId = tradeData.id;

      // Insert entry points if provided
      if (entries && entries.length > 0) {
        const entryRecords = entries.map(entry => ({
          trade_id: tradeId,
          date: entry.date,
          price: entry.price,
          quantity: entry.quantity,
          notes: entry.notes
        }));

        const { error: entriesError } = await supabase
          .from('trade_entries')
          .insert(entryRecords);

        if (entriesError) {
          console.error('Error adding trade entries:', entriesError);
          // Handle rollback if needed
          await deleteTrade(tradeId);
          return null;
        }
      }

      // Insert exit points if provided
      if (exits && exits.length > 0) {
        const exitRecords = exits.map(exit => ({
          trade_id: tradeId,
          date: exit.date,
          price: exit.price,
          quantity: exit.quantity,
          is_stop_loss: exit.is_stop_loss,
          is_take_profit: exit.is_take_profit,
          execution_status: exit.execution_status,
          notes: exit.notes
        }));

        const { error: exitsError } = await supabase
          .from('trade_exits')
          .insert(exitRecords);

        if (exitsError) {
          console.error('Error adding trade exits:', exitsError);
          // Handle rollback if needed
          await deleteTrade(tradeId);
          return null;
        }
      }

      // Return the newly created trade with all its details
      return getTrade(tradeId);
    } catch (error) {
      console.error('Error in addTrade:', error);
      return null;
    }
  };

  // Function to update a trade with multiple entry/exit points
  const updateTrade = async (id: number, trade: Partial<Trade> & { 
    entries?: TradeEntry[]; 
    exits?: TradeExit[]; 
  }): Promise<Trade | null> => {
    if (!user) return null;

    try {
      // Extract entries and exits from the trade object
      const { entries, exits, ...mainTradeData } = trade;
      
      // If we're updating prices or quantities, recalculate profit/loss
      if (mainTradeData.entry_price || mainTradeData.exit_price || 
          mainTradeData.quantity || mainTradeData.direction || 
          mainTradeData.status) {
        
        // Get current trade data to have complete information for calculations
        const { data: currentTrade } = await supabase
          .from('trades')
          .select('*')
          .eq('id', id)
          .single();
  
        if (currentTrade) {
          const entryPrice = mainTradeData.entry_price || currentTrade.entry_price;
          const exitPrice = mainTradeData.exit_price || currentTrade.exit_price;
          const quantity = mainTradeData.quantity || currentTrade.quantity;
          const direction = mainTradeData.direction || currentTrade.direction;
          const status = mainTradeData.status || currentTrade.status;
  
          if (status === 'closed' && exitPrice) {
            if (direction === 'long') {
              mainTradeData.profit_loss = (exitPrice - entryPrice) * quantity;
              mainTradeData.profit_loss_percent = ((exitPrice - entryPrice) / entryPrice) * 100;
            } else {
              mainTradeData.profit_loss = (entryPrice - exitPrice) * quantity;
              mainTradeData.profit_loss_percent = ((entryPrice - exitPrice) / entryPrice) * 100;
            }
          }
        }
      }
  
      // Update the main trade record
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .update(mainTradeData)
        .eq('id', id)
        .select()
        .single();
  
      if (tradeError) {
        console.error('Error updating trade:', tradeError);
        return null;
      }
  
      // Handle entries if provided
      if (entries) {
        // First, delete all existing entries
        const { error: deleteEntriesError } = await supabase
          .from('trade_entries')
          .delete()
          .eq('trade_id', id);
  
        if (deleteEntriesError) {
          console.error('Error deleting existing entries:', deleteEntriesError);
          return null;
        }
  
        // Then insert all new entries
        if (entries.length > 0) {
          const entryRecords = entries.map(entry => ({
            trade_id: id,
            date: entry.date,
            price: entry.price,
            quantity: entry.quantity,
            notes: entry.notes
          }));
  
          const { error: insertEntriesError } = await supabase
            .from('trade_entries')
            .insert(entryRecords);
  
          if (insertEntriesError) {
            console.error('Error inserting updated entries:', insertEntriesError);
            return null;
          }
        }
      }
  
      // Handle exits if provided
      if (exits) {
        // First, delete all existing exits
        const { error: deleteExitsError } = await supabase
          .from('trade_exits')
          .delete()
          .eq('trade_id', id);
  
        if (deleteExitsError) {
          console.error('Error deleting existing exits:', deleteExitsError);
          return null;
        }
  
        // Then insert all new exits
        if (exits.length > 0) {
          const exitRecords = exits.map(exit => ({
            trade_id: id,
            date: exit.date,
            price: exit.price,
            quantity: exit.quantity,
            is_stop_loss: exit.is_stop_loss,
            is_take_profit: exit.is_take_profit,
            execution_status: exit.execution_status,
            notes: exit.notes
          }));
  
          const { error: insertExitsError } = await supabase
            .from('trade_exits')
            .insert(exitRecords);
  
          if (insertExitsError) {
            console.error('Error inserting updated exits:', insertExitsError);
            return null;
          }
        }
      }
  
      // Return the updated trade with all its details
      return getTrade(id);
    } catch (error) {
      console.error('Error in updateTrade:', error);
      return null;
    }
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
          default_indicators: ['RSI', 'MACD', 'Moving Average', 'Bollinger Bands'],
          custom_strategies: [],
          default_strategies: ['swing', 'day', 'position', 'momentum', 'scalp', 'breakout', 'trend']
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

    try {
      // First, get the current settings to know what fields exist
      const { data: currentSettings, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Error fetching current user settings:', fetchError);
        return null;
      }

      // Create an update object with only the fields that exist in the database
      const updateObj: any = {};
      
      // For each property in settings, only add it to updateObj if it exists in currentSettings
      for (const key in settings) {
        if (key in currentSettings || key === 'user_id') {
          updateObj[key] = settings[key as keyof typeof settings];
        } else {
          console.warn(`Field '${key}' not found in user_settings table, skipping.`);
        }
      }

      // Update settings with only the valid fields
      const { data, error } = await supabase
        .from('user_settings')
        .update(updateObj)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user settings:', error);
        return null;
      }

      return data as UserSettings;
    } catch (error) {
      console.error('Exception while updating user settings:', error);
      return null;
    }
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

  // Function to upload a trade screenshot
  const uploadTradeScreenshot = async (tradeId: number, file: File): Promise<{ id: string, url: string } | null> => {
    if (!user) return null;
    
    try {
      // 1. Check if the user has access to the trade
      const { data: tradeData, error: tradeError } = await supabase
        .from('trades')
        .select('user_id')
        .eq('id', tradeId)
        .single();
        
      if (tradeError) {
        console.error('Error checking trade access:', tradeError);
        return null;
      }
      
      if (tradeData.user_id !== user.id) {
        console.error('User does not have permission to upload to this trade');
        return null;
      }
      
      // 2. Generate a unique file name with a path that includes user ID
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${user.id}/${tradeId}/${fileName}`;
      
      console.log('Uploading to path:', filePath);
      
      // 3. Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('screenshots')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (uploadError) {
        console.error('Error uploading screenshot to storage:', uploadError);
        return null;
      }
      
      // 4. Get public URL
      const { data: urlData } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        console.error('Error getting public URL for screenshot');
        return null;
      }
      
      const publicUrl = urlData.publicUrl;
      console.log('File uploaded successfully. Public URL:', publicUrl);
      
      // 5. Create record in database
      const { data: screenshotData, error: insertError } = await supabase
        .from('trade_screenshots')
        .insert([
          { 
            trade_id: tradeId, 
            user_id: user.id,
            file_path: filePath,
            file_name: file.name
          }
        ])
        .select('id')
        .single();
        
      if (insertError) {
        console.error('Error saving screenshot record to database:', insertError);
        
        // 6. If database insert fails, clean up the uploaded file
        const { error: cleanupError } = await supabase.storage
          .from('screenshots')
          .remove([filePath]);
          
        if (cleanupError) {
          console.error('Error cleaning up orphaned file:', cleanupError);
        }
        
        return null;
      }
      
      return {
        id: screenshotData.id,
        url: publicUrl
      };
    } catch (error) {
      console.error('Exception uploading screenshot:', error);
      return null;
    }
  };

  // Function to delete a trade screenshot
  const deleteTradeScreenshot = async (screenshotId: string): Promise<boolean> => {
    if (!user) return false;
    
    try {
      // First get the screenshot record to get the file path
      const { data, error } = await supabase
        .from('trade_screenshots')
        .select('file_path')
        .eq('id', screenshotId)
        .single();
        
      if (error) {
        console.error('Error getting screenshot record:', error);
        return false;
      }
      
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('screenshots')
        .remove([data.file_path]);
        
      if (storageError) {
        console.error('Error deleting screenshot file:', storageError);
      }
      
      // Delete the database record
      const { error: deleteError } = await supabase
        .from('trade_screenshots')
        .delete()
        .eq('id', screenshotId);
        
      if (deleteError) {
        console.error('Error deleting screenshot record:', deleteError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception deleting screenshot:', error);
      return false;
    }
  };

  // Function to get trade screenshots
  const getTradeScreenshots = async (tradeId: number): Promise<any[]> => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('trade_screenshots')
        .select('*')
        .eq('trade_id', tradeId)
        .order('created_at', { ascending: true });
        
      if (error) {
        console.error('Error fetching trade screenshots:', error);
        return [];
      }
      
      // Add public URLs to the screenshot records
      return data.map(screenshot => {
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(screenshot.file_path);
          
        return {
          ...screenshot,
          url: urlData.publicUrl
        };
      });
    } catch (error) {
      console.error('Exception fetching screenshots:', error);
      return [];
    }
  };

  // Get entry points for a trade
  const getTradeEntries = async (tradeId: number): Promise<TradeEntry[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('trade_entries')
      .select('*')
      .eq('trade_id', tradeId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching trade entries:', error);
      return [];
    }

    return data as TradeEntry[];
  };

  // Add a new entry point
  const addTradeEntry = async (tradeId: number, entry: TradeEntryInput): Promise<TradeEntry | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trade_entries')
      .insert([{ ...entry, trade_id: tradeId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding trade entry:', error);
      return null;
    }

    return data as TradeEntry;
  };

  // Update an entry point
  const updateTradeEntry = async (id: number, entry: Partial<TradeEntryInput>): Promise<TradeEntry | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trade_entries')
      .update(entry)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade entry:', error);
      return null;
    }

    return data as TradeEntry;
  };

  // Delete an entry point
  const deleteTradeEntry = async (id: number): Promise<void> => {
    if (!user) return;

    const { error } = await supabase
      .from('trade_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trade entry:', error);
    }
  };

  // Get exit points for a trade
  const getTradeExits = async (tradeId: number): Promise<TradeExit[]> => {
    if (!user) return [];

    const { data, error } = await supabase
      .from('trade_exits')
      .select('*')
      .eq('trade_id', tradeId)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching trade exits:', error);
      return [];
    }

    return data as TradeExit[];
  };

  // Add a new exit point
  const addTradeExit = async (tradeId: number, exit: TradeExitInput): Promise<TradeExit | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trade_exits')
      .insert([{ ...exit, trade_id: tradeId }])
      .select()
      .single();

    if (error) {
      console.error('Error adding trade exit:', error);
      return null;
    }

    return data as TradeExit;
  };

  // Update an exit point
  const updateTradeExit = async (id: number, exit: Partial<TradeExitInput>): Promise<TradeExit | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('trade_exits')
      .update(exit)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trade exit:', error);
      return null;
    }

    return data as TradeExit;
  };

  // Delete an exit point
  const deleteTradeExit = async (id: number): Promise<void> => {
    if (!user) return;

    const { error } = await supabase
      .from('trade_exits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trade exit:', error);
    }
  };

  const value = {
    getTrades,
    getTrade,
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
    deleteTradeIndicator,
    uploadTradeScreenshot,
    deleteTradeScreenshot,
    getTradeScreenshots,
    getTradeEntries,
    addTradeEntry,
    updateTradeEntry,
    deleteTradeEntry,
    getTradeExits,
    addTradeExit,
    updateTradeExit,
    deleteTradeExit,
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