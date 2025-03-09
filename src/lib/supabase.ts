// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and anon key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Type definitions for trade-related data
export interface Trade {
    id: number;
    created_at: string;
    user_id: string;
    symbol: string;
    entry_date: string;
    exit_date?: string;
    entry_price: number;
    exit_price?: number;
    quantity: number;
    direction: 'long' | 'short';
    status: 'open' | 'closed';
    strategy?: string;
    notes?: string;
    tags?: string[];
    profit_loss?: number;
    profit_loss_percent?: number;
    journal_id?: number;
}

export type NewTrade = Omit<Trade, 'id' | 'created_at' | 'user_id' | 'profit_loss' | 'profit_loss_percent'>;