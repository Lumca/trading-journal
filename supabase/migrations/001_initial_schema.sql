-- Create extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with appropriate relationships and constraints

-- Journals table
CREATE TABLE public.journals (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    base_currency TEXT DEFAULT 'USD',
    tags TEXT[]
);

-- Trades table
CREATE TABLE public.trades (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    journal_id INTEGER REFERENCES public.journals(id) ON DELETE SET NULL,
    symbol TEXT NOT NULL,
    entry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_date TIMESTAMP WITH TIME ZONE,
    entry_price NUMERIC(15, 5) NOT NULL,
    exit_price NUMERIC(15, 5),
    quantity NUMERIC(15, 5) NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('long', 'short')),
    status TEXT NOT NULL CHECK (status IN ('open', 'closed', 'planned')),
    strategy TEXT,
    notes TEXT,
    tags TEXT[],
    profit_loss NUMERIC(15, 5),
    profit_loss_percent NUMERIC(15, 5),
    fees NUMERIC(15, 5) DEFAULT 0,
    fee_type TEXT DEFAULT 'fixed',
    fee_details JSONB
);

-- Trade entries table (for detailed entry points)
CREATE TABLE public.trade_entries (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER REFERENCES public.trades(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    price NUMERIC(15, 5) NOT NULL,
    quantity NUMERIC(15, 5) NOT NULL,
    notes TEXT
);

-- Trade exits table (for detailed exit points)
CREATE TABLE public.trade_exits (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER REFERENCES public.trades(id) ON DELETE CASCADE,
    date TIMESTAMP WITH TIME ZONE,
    price NUMERIC(15, 5),
    quantity NUMERIC(15, 5),
    is_stop_loss BOOLEAN DEFAULT FALSE,
    is_take_profit BOOLEAN DEFAULT FALSE,
    execution_status TEXT DEFAULT 'pending' CHECK (execution_status IN ('pending', 'executed', 'canceled')),
    notes TEXT
);

-- Trade indicators table
CREATE TABLE public.trade_indicators (
    id SERIAL PRIMARY KEY,
    trade_id INTEGER REFERENCES public.trades(id) ON DELETE CASCADE,
    indicator_name TEXT NOT NULL,
    notes TEXT
);

-- Trade screenshots table
CREATE TABLE public.trade_screenshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trade_id INTEGER REFERENCES public.trades(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL
);

-- User settings table
CREATE TABLE public.user_settings (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    enable_registration BOOLEAN DEFAULT TRUE,
    custom_symbols TEXT[] DEFAULT '{}',
    custom_asset_classes TEXT[] DEFAULT '{}',
    default_asset_classes JSONB DEFAULT '{"forex": ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD"], "crypto": ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "BCH/USD"], "stocks": ["AAPL", "MSFT", "GOOGL", "AMZN", "META"]}',
    custom_indicators TEXT[] DEFAULT '{}',
    default_indicators TEXT[] DEFAULT '{"RSI", "MACD", "Moving Average", "Bollinger Bands"}',
    custom_strategies TEXT[] DEFAULT '{}',
    default_strategies TEXT[] DEFAULT '{"swing", "day", "position", "momentum", "scalp", "breakout", "trend"}'
);

-- Create appropriate indexes for performance
CREATE INDEX idx_journals_user_id ON public.journals(user_id);
CREATE INDEX idx_trades_user_id ON public.trades(user_id);
CREATE INDEX idx_trades_journal_id ON public.trades(journal_id);
CREATE INDEX idx_trade_entries_trade_id ON public.trade_entries(trade_id);
CREATE INDEX idx_trade_exits_trade_id ON public.trade_exits(trade_id);
CREATE INDEX idx_trade_indicators_trade_id ON public.trade_indicators(trade_id);
CREATE INDEX idx_trade_screenshots_trade_id ON public.trade_screenshots(trade_id);

-- Set up RLS (Row Level Security) for Supabase
-- Enable RLS on all tables
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_exits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Journals policies
CREATE POLICY "Users can view their own journals" 
    ON public.journals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own journals" 
    ON public.journals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journals" 
    ON public.journals FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journals" 
    ON public.journals FOR DELETE
    USING (auth.uid() = user_id);

-- Trades policies
CREATE POLICY "Users can view their own trades" 
    ON public.trades FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own trades" 
    ON public.trades FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trades" 
    ON public.trades FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trades" 
    ON public.trades FOR DELETE
    USING (auth.uid() = user_id);

-- Trade entries policies
CREATE POLICY "Users can view entries for their trades" 
    ON public.trade_entries FOR SELECT
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can insert entries for their trades" 
    ON public.trade_entries FOR INSERT
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can update entries for their trades" 
    ON public.trade_entries FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can delete entries for their trades" 
    ON public.trade_entries FOR DELETE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

-- Trade exits policies
CREATE POLICY "Users can view exits for their trades" 
    ON public.trade_exits FOR SELECT
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can insert exits for their trades" 
    ON public.trade_exits FOR INSERT
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can update exits for their trades" 
    ON public.trade_exits FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can delete exits for their trades" 
    ON public.trade_exits FOR DELETE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

-- Trade indicators policies
CREATE POLICY "Users can view indicators for their trades" 
    ON public.trade_indicators FOR SELECT
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can insert indicators for their trades" 
    ON public.trade_indicators FOR INSERT
    WITH CHECK (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can update indicators for their trades" 
    ON public.trade_indicators FOR UPDATE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

CREATE POLICY "Users can delete indicators for their trades" 
    ON public.trade_indicators FOR DELETE
    USING (auth.uid() = (SELECT user_id FROM public.trades WHERE id = trade_id));

-- Trade screenshots policies
CREATE POLICY "Users can view screenshots for their trades" 
    ON public.trade_screenshots FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert screenshots for their trades" 
    ON public.trade_screenshots FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete screenshots for their trades" 
    ON public.trade_screenshots FOR DELETE
    USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view their own settings" 
    ON public.user_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
    ON public.user_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
    ON public.user_settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Create storage bucket for screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policy for screenshots bucket
CREATE POLICY "Users can upload their own screenshots" 
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own screenshots" 
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own screenshots" 
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own screenshots" 
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public can view screenshots
CREATE POLICY "Public can view screenshots" 
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'screenshots');