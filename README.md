# Props Bible

A comprehensive props management system for theatrical productions.

## Features

- Manage props for multiple shows
- Track prop details including dimensions, weight, and usage instructions
- Collaborative features for team management
- Pre-show setup tracking
- Export to CSV for offline use

## Setup

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd props-bible
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   - Copy `.env.example` to `.env`
   - Fill in your Firebase configuration details

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required:

- `VITE_FIREBASE_API_KEY`: Your Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN`: Your Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET`: Your Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID`: Your Firebase app ID
- `VITE_CURRENCY`: Default currency (e.g., GBP)
- `VITE_SHOW_NAME`: Default show name
- `VITE_SHOW_ACTS`: Default number of acts
- `VITE_SHOW_SCENES`: Default number of scenes

## License

MIT