import { Trade } from './supabase';

export interface Journal {
    id: number;
    created_at: string;
    user_id: string;
    name: string;
    description?: string;
    is_active: boolean;
    base_currency: string;
    tags?: string[];
}

export type NewJournal = Omit<Journal, 'id' | 'created_at' | 'user_id'>;

export interface UserSettings {
    id: number;
    user_id: string;
    enable_registration: boolean;
    custom_symbols: string[];
    custom_asset_classes: string[];
    default_asset_classes: {
        forex: string[];
        crypto: string[];
        stocks: string[];
        [key: string]: string[];
    };
    custom_indicators: string[];
    default_indicators: string[];
}

export interface TradeIndicator {
    id: number;
    trade_id: number;
    indicator_name: string;
    notes?: string;
}

export interface TradeWithIndicators extends Trade {
    indicators?: TradeIndicator[];
}

export type AssetClass = 'forex' | 'crypto' | 'stocks' | 'custom';