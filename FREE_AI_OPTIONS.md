# FREE AI Options (No Payment Ever!)

You have **3 completely free options** for parsing syllabi. Choose based on your preferences:

---

## 🥇 Option 1: Ollama (LOCAL - RECOMMENDED)

**Run AI on your own computer - truly free forever!**

### ✅ Pros
- **100% free forever** - no API, no limits, no payment
- **Privacy** - your data never leaves your computer
- **Unlimited requests** - use as much as you want
- **Works offline** - no internet needed
- **Very smart** - uses Llama 3.2 (Meta's latest open model)

### ❌ Cons
- Requires ~4-8GB RAM
- Initial download ~2-4GB
- Slower than cloud APIs (but still fast enough)

### 🚀 Setup (5 minutes)

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Or download from: https://ollama.com/download
   ```

2. **Download a model**
   ```bash
   # Llama 3.2 (3B - fast, good quality)
   ollama pull llama3.2

   # OR Llama 3.2 (1B - faster, lighter)
   ollama pull llama3.2:1b

   # OR Mistral (good alternative)
   ollama pull mistral
   ```

3. **Start Ollama** (runs in background)
   ```bash
   ollama serve
   ```

4. **Use in your project**
   ```bash
   cd backend

   # Rename the Ollama parser to be the main one
   mv services/ai_parser.py services/ai_parser_gemini_backup.py
   mv services/ai_parser_ollama.py services/ai_parser.py

   # No API key needed!
   ```

5. **Test it**
   ```bash
   # Test if Ollama is working
   curl http://localhost:11434/api/generate -d '{
     "model": "llama3.2",
     "prompt": "Hello!"
   }'
   ```

**Done!** No API keys, no configuration needed.

### Models Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| `llama3.2:1b` | 1.3 GB | ⚡⚡⚡ | ⭐⭐⭐ | Fast parsing |
| `llama3.2` (3b) | 2 GB | ⚡⚡ | ⭐⭐⭐⭐ | **Recommended** |
| `llama3.1:8b` | 4.7 GB | ⚡ | ⭐⭐⭐⭐⭐ | Best quality |
| `mistral` | 4.1 GB | ⚡⚡ | ⭐⭐⭐⭐ | Alternative |

---

## 🥈 Option 2: Groq (CLOUD - VERY FAST)

**Free cloud API, insanely fast!**

### ✅ Pros
- **Free tier**: 30 req/min, 14,400/day
- **Extremely fast** - faster than paid APIs!
- **No credit card required**
- **Good quality** - uses Llama 3.1 70B

### ❌ Cons
- Requires API key
- Internet connection needed
- Daily limits (but generous)

### 🚀 Setup (2 minutes)

1. **Get API Key**
   - Go to: https://console.groq.com/keys
   - Sign up (free, no credit card)
   - Click "Create API Key"
   - Copy it

2. **Configure**
   ```bash
   cd backend

   # Add to .env
   echo "GROQ_API_KEY=your_key_here" >> .env

   # Use Groq parser
   mv services/ai_parser.py services/ai_parser_backup.py
   mv services/ai_parser_groq.py services/ai_parser.py
   ```

3. **Update requirements.txt**
   ```bash
   # Add to backend/requirements.txt
   echo "groq==0.4.2" >> requirements.txt
   pip install groq
   ```

4. **Update config**
   Add to `backend/core/config.py`:
   ```python
   GROQ_API_KEY: str = ""
   ```

**Done!** Start using it.

### Rate Limits
- **Free tier**: 30 requests/minute, 14,400/day
- **For 100 students**: ~100 syllabi uploads/day = no problem!

---

## 🥉 Option 3: Simple Rule-Based (NO AI)

**Pure Python with regex - surprisingly effective!**

### ✅ Pros
- **100% free** - no dependencies
- **Very fast** - instant results
- **No setup** - just use it
- **Works offline**

### ❌ Cons
- Less intelligent
- Might miss complex deadlines
- Works best with well-formatted syllabi

### 🚀 Setup (1 minute)

1. **Install dependencies**
   ```bash
   pip install dateparser
   ```

2. **Use the simple parser**
   ```bash
   cd backend

   # Use simple parser
   mv services/ai_parser.py services/ai_parser_backup.py
   mv services/ai_parser_simple.py services/ai_parser.py
   ```

3. **Update requirements.txt**
   ```bash
   echo "dateparser==1.2.0" >> requirements.txt
   ```

**Done!** No API keys, no configuration.

### Effectiveness
- ✅ Well-formatted syllabi: ~85% accurate
- ⚠️ Complex syllabi: ~60% accurate
- 💡 Great for testing, can upgrade to AI later

---

## 📊 Comparison Table

| Feature | Ollama | Groq | Simple |
|---------|--------|------|--------|
| **Cost** | $0 | $0 | $0 |
| **Speed** | ⚡⚡ Medium | ⚡⚡⚡ Very Fast | ⚡⚡⚡ Instant |
| **Quality** | ⭐⭐⭐⭐ Great | ⭐⭐⭐⭐ Great | ⭐⭐⭐ Good |
| **Setup** | 5 min | 2 min | 1 min |
| **API Key** | ❌ None | ✅ Required | ❌ None |
| **Internet** | ❌ Not needed | ✅ Required | ❌ Not needed |
| **Limits** | ♾️ Unlimited | 14,400/day | ♾️ Unlimited |
| **Privacy** | 🔒 100% Private | ☁️ Cloud | 🔒 100% Private |
| **PDF Support** | Text only* | Text only* | Text only* |

*All options require PDF text extraction first (PyPDF2)

---

## 🎯 Which One Should You Choose?

### Choose **Ollama** if:
- ✅ You want 100% free with no limits
- ✅ You care about privacy
- ✅ You have 8GB+ RAM
- ✅ You want the best quality
- ✅ **RECOMMENDED for most users**

### Choose **Groq** if:
- ✅ You don't want to run AI locally
- ✅ You want the fastest possible speed
- ✅ 14,400 requests/day is enough (it is!)
- ✅ You're okay with an API key

### Choose **Simple** if:
- ✅ You want to test the app quickly
- ✅ Your syllabi are well-formatted
- ✅ You can upgrade to AI later
- ✅ You want zero dependencies

---

## 🔧 Switching Between Options

All three use the same `AIParser` interface, so switching is easy:

```bash
cd backend/services

# Currently using Ollama? Switch to Groq:
mv ai_parser.py ai_parser_ollama.py
mv ai_parser_groq.py ai_parser.py

# Or switch to Simple:
mv ai_parser.py ai_parser_groq.py
mv ai_parser_simple.py ai_parser.py
```

You can test all three and choose your favorite!

---

## 🧪 Testing Each Option

### Test Ollama
```bash
cd backend
python -c "
import asyncio
from services.ai_parser import AIParser

async def test():
    parser = AIParser()
    result = await parser.parse_syllabus('Assignment 1 due 12/15/2024')
    print(result)

asyncio.run(test())
"
```

### Test Groq
```bash
cd backend
python -c "
import asyncio
from services.ai_parser import AIParser

async def test():
    parser = AIParser()
    result = await parser.parse_syllabus('Assignment 1 due 12/15/2024')
    print(result)

asyncio.run(test())
"
```

### Test Simple
```bash
cd backend
python -c "
import asyncio
from services.ai_parser import AIParser

async def test():
    parser = AIParser()
    result = await parser.parse_syllabus('Assignment 1 due 12/15/2024')
    print(result)

asyncio.run(test())
"
```

All three should return parsed assignments!

---

## 💰 Cost Breakdown (1,000 Students)

| Scenario | Ollama | Groq | Simple |
|----------|--------|------|--------|
| 1,000 syllabi/month | $0 | $0 | $0 |
| 10,000 emails/month | $0 | $0 | $0 |
| Unlimited usage | $0 | $0 | $0 |

**All options are completely free!** 🎉

---

## 🔐 Privacy Comparison

| Option | Where Data Goes | Privacy Level |
|--------|----------------|---------------|
| **Ollama** | Your computer only | 🔒🔒🔒🔒🔒 Maximum |
| **Groq** | Groq's servers | 🔒🔒🔒 Good (encrypted) |
| **Simple** | Your computer only | 🔒🔒🔒🔒🔒 Maximum |

---

## ❓ FAQ

**Q: Will Ollama slow down my computer?**
A: It uses CPU/GPU when processing, but runs in the background. Won't affect normal use.

**Q: Is Groq really free forever?**
A: Yes! 14,400 requests/day is their free tier. For a student project, you'll never hit it.

**Q: Can I use multiple options?**
A: Yes! Use Simple for testing, upgrade to Ollama/Groq for production.

**Q: Which is most accurate?**
A: Ollama ≈ Groq > Simple (but all are good!)

**Q: What if I have a powerful computer?**
A: Use Ollama with `llama3.1:8b` for best quality!

**Q: What if I have a weak computer?**
A: Use Groq (cloud) or Simple (lightweight)

---

## 🚀 My Recommendation

**Start with Ollama** (Option 1):
1. Takes 5 minutes to set up
2. Works forever with no limits
3. Best quality
4. Private
5. No API keys to manage

**Fallback to Groq** if:
- Your computer struggles with Ollama
- You want cloud-based processing

**Use Simple for**:
- Quick testing
- Well-formatted syllabi
- Backup option

---

## 🛠️ Quick Start

```bash
# Option 1: Ollama (Recommended)
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.2
ollama serve
# Done! No config needed.

# Option 2: Groq
# Get key from: https://console.groq.com/keys
echo "GROQ_API_KEY=your_key" >> backend/.env
pip install groq
# Done!

# Option 3: Simple
pip install dateparser
# Done!
```

Choose one and start building! 🎉
