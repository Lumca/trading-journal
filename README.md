# Trading Journal Setup Guide

This guide will help you set up your Trading Journal application with Supabase as the backend.

## Prerequisites

- Node.js 16.x or higher
- npm or yarn
- A Supabase account

## Step 1: Clone and Install Dependencies

1. Clone or download the project repository
2. Navigate to the project directory
3. Install the dependencies:

```bash
npm install
```

## Step 2: Set Up Supabase

1. Sign up or log in to [Supabase](https://supabase.com/)
2. Create a new project
3. Once your project is created, navigate to the SQL Editor in the Supabase dashboard
4. Create the necessary tables and functions by running the SQL queries found in the `supabase-schema.sql` file

## Step 3: Configure Environment Variables

1. Copy the `.env` file to `.env.local`
2. Update the Supabase URL and anon key in the `.env.local` file:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

You can find these values in your Supabase project dashboard under Settings > API.

## Step 4: Start the Development Server

```bash
npm run dev
```

The application should now be running at [http://localhost:5173](http://localhost:5173)

## Step 5: Create a User Account

1. Open the application in your browser
2. Click on "Create account" to register a new user
3. Check your email for the verification link (check spam folder if needed)
4. After verification, you can log in with your email and password

## Using the Trading Journal

### Adding a Trade

1. Click the "Add Trade" button
2. Fill in the trade details:
   - Symbol (e.g., AAPL, TSLA)
   - Direction (Long or Short)
   - Entry Date and Price
   - Quantity
   - Strategy (optional)
   - Tags (optional, comma-separated)
   - Notes (optional)
3. If the trade is closed, toggle "Trade Closed" and provide exit date and price
4. Click "Add Trade" to save

### Editing or Deleting a Trade

- To edit a trade, click the edit icon in the Actions column
- To delete a trade, click the delete icon in the Actions column

### Viewing Trade Statistics

The dashboard provides a summary of your trading performance:
- Win rate
- Total number of trades
- Open positions
- Total profit/loss
- Largest win
- Largest loss

## Customization Options

### Theme

You can customize the application theme in `src/App.tsx` by modifying the theme object:

```typescript
const theme = createTheme({
  primaryColor: 'blue',  // Change to your preferred color
  defaultRadius: 'md',
  // Add more customizations here
});
```

### Adding More Features

Some ideas for extending the application:
1. Trade filters and sorting
2. Data visualization with charts
3. Import/export functionality
4. Position sizing calculator
5. Trade journaling with image uploads
6. Performance metrics by strategy, symbol, etc.

## Troubleshooting

- **Authentication Issues**: Make sure your Supabase URL and anon key are correct
- **Database Errors**: Check the SQL schema and ensure all tables and functions exist
- **API Errors**: Check the browser console for specific error messages

For more help, refer to the [Supabase documentation](https://supabase.com/docs) or the [Mantine documentation](https://mantine.dev/docs/getting-started/introduction/).