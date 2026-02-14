# Almanac Setup Guide

## Quick Start

1. **Configure API Keys** (see below for where to get them)
2. **Run the startup script:**
   ```bash
   ./startup.sh
   ```
3. **Open your browser:** http://localhost:3000

## API Keys Required

### 1. Google OAuth (for Calendar integration)

**Where to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Configure OAuth consent screen
6. Create credentials for "Web application"
7. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

**Add to `.env`:**
```
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret-here
```

### 2. DeepSeek API Key (for AI features)

**Where to get:**
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Sign up for an account
3. Get your API key from the dashboard
4. **Free tier:** 5M tokens ($8.40 value)
5. **Paid:** Very cheap - $0.28/M input, $0.42/M output

**Add to `.env`:**
```
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 3. Gemini API Key (for Course Scanner)

**Where to get:**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key" or "Create API Key"
4. Copy your API key
5. **Free tier available**

**Add to `course_scanner/.env`:**
```
GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## Configuration Files

### Main Application (`.env`)

Located at project root. Copy from `.env.example` if needed.

```bash
# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-long-random-string-change-this-in-production

# Google OAuth
GOOGLE_CLIENT_ID=PASTE_YOUR_GOOGLE_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=PASTE_YOUR_GOOGLE_CLIENT_SECRET_HERE

# AI API Keys
DEEPSEEK_API_KEY=PASTE_YOUR_DEEPSEEK_API_KEY_HERE

# Database (SQLite - auto-configured)
DATABASE_URL="file:./dev.db"
```

### Course Scanner (`course_scanner/.env`)

Located in `course_scanner/` directory.

```bash
# Google Gemini API Key
GEMINI_API_KEY=PASTE_YOUR_GEMINI_API_KEY_HERE
```

## What the Startup Script Does

The `startup.sh` script automatically:

1. ✅ Checks for Node.js and npm
2. ✅ Verifies `.env` file exists
3. ✅ Warns if API keys are missing
4. ✅ Installs npm dependencies (if needed)
5. ✅ Generates Prisma client
6. ✅ Sets up SQLite database (if needed)
7. ✅ Runs database migrations
8. ✅ Checks Course Scanner configuration
9. 🚀 Starts Next.js development server on port 3000

## Manual Setup (if needed)

If you prefer to run commands manually:

```bash
# Install dependencies
npm install

# Set up database
npx prisma generate
npx prisma migrate dev

# Start dev server
npm run dev
```

## Using Course Scanner

The Course Scanner is a separate Python tool for extracting assignments from syllabi.

### Setup Course Scanner

```bash
cd course_scanner
source venv/bin/activate  # venv already set up
python main.py path/to/syllabus.pdf
```

See `course_scanner/USAGE.md` for detailed instructions.

## Troubleshooting

### Port 3000 already in use

Kill the existing process:
```bash
lsof -ti:3000 | xargs kill -9
```

Or change the port in `package.json`:
```json
"dev": "next dev -p 3001"
```

### Missing dependencies

```bash
rm -rf node_modules package-lock.json
npm install
```

### Database issues

```bash
rm dev.db
npx prisma migrate dev --name init
```

### Course Scanner issues

```bash
cd course_scanner
source venv/bin/activate
python verify_setup.py
```

## Project Structure

```
almanac/
├── .env                    # Main app configuration
├── startup.sh              # One-command startup script
├── package.json            # Dependencies
├── prisma/                 # Database schema
├── app/                    # Next.js app directory
├── components/             # React components
├── lib/                    # Utility functions
└── course_scanner/         # Python syllabus extractor
    ├── .env                # Gemini API key
    ├── main.py             # CLI tool
    ├── converter.py        # PDF processing
    ├── extractor.py        # AI extraction
    └── venv/               # Python virtual env
```

## Next Steps

1. Configure all API keys in `.env` and `course_scanner/.env`
2. Run `./startup.sh`
3. Visit http://localhost:3000
4. Sign in with Google
5. Start using Almanac!

## Getting Help

- **Course Scanner:** See `course_scanner/README.md`
- **Main App:** Check Next.js docs at https://nextjs.org/docs
- **Issues:** Report at the project repository

## Security Notes

- **Never commit `.env` files** to git (already in `.gitignore`)
- Change `NEXTAUTH_SECRET` in production
- Keep API keys secure and don't share them
- Use environment-specific `.env` files for production

---

**Ready to start?** Run `./startup.sh` and you're good to go! 🚀
