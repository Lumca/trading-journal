# Trading Journal
A comprehensive web application for traders to track and analyze their trading performance.

## Features

- 📊 Track trades across multiple journals
- 📈 Visualize performance with detailed statistics
- 📅 View trades on an interactive calendar
- 🔍 Filter and search through your trading history
- 📱 Responsive design that works on desktop and mobile
- 🌓 Multiple themes with light and dark mode
- 🔒 Secure authentication with Supabase

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Components**: Mantine UI
- **Auth & Database**: Supabase
- **Routing**: React Router
- **Charts**: Recharts
- **Styling**: CSS-in-JS with Mantine

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm
- Supabase account

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Lumca/trading-journal.git
   cd trading-journal
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Create a `.env` file in the root directory with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Database Setup

This application requires several tables in your Supabase database. You'll need to set up:

- users
- journals
- trades
- trade_entries
- trade_exits
- trade_indicators
- trade_screenshots
- user_settings

Detailed schema information can be found in supabase/migrations/001_initial_schema.sql

## Deployment

### Deploy with Vercel

Click the "Deploy with Vercel" button at the top of this README to deploy your own instance of Trading Journal.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLumca%2Ftrading-journal)

### Environment Variables

Make sure to set the following environment variables in your Vercel project:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Mantine UI](https://mantine.dev/) for the beautiful UI components
- [Supabase](https://supabase.io/) for auth and database
- [Recharts](https://recharts.org/) for the charting library