# ThumbGen

An open-source, node-based YouTube thumbnail generator built on an infinite canvas. Connect face references, style references, and text prompts to AI models (Google Gemini and Ideogram v3) to generate thumbnails.

## Demo

<video src="https://github.com/pat-pivot/thumbgen/raw/main/demo.mp4" controls width="100%"></video>

## How It Works

ThumbGen uses a visual node editor where you wire together inputs and AI models:

1. **Face Reference** - Upload a photo of the person who should appear in the thumbnail
2. **Swipe File / Reference Thumbnail** - Upload or import a thumbnail whose style/composition you want to match
3. **Text Prompt** - Optionally describe customizations (change text, colors, background, etc.)
4. **Generator** - Pick Nano Banana (Gemini) or Ideogram v3, connect your inputs, and hit Run

The system automatically constructs the right prompts and API calls. When both a face and reference thumbnail are connected, it tells the AI: "Recreate this thumbnail's style but with this person's face." No prompt engineering needed.

### Node Types

| Node | Purpose |
|------|---------|
| **Face Reference** | Upload a face photo. Connected to a generator's "Face" input. |
| **Swipe File** | Upload or import a reference thumbnail. Connected to "Reference" input. |
| **Prompt** | Write a text prompt and/or negative prompt. Connected to "Prompt" input. |
| **Generator** | Runs the AI model. Has three input handles (Prompt, Face, Reference) and one output (Result). |
| **Preview** | Displays the generated thumbnail. Download or iterate. |

### Workflow Example

```
[Face Photo] ----\
                  \
[Reference Thumb] --> [Generator (Nano Banana)] --> [Preview] --> Download
                  /
[Text Prompt] ---/
```

## Features

- Infinite canvas with pan, zoom, snap-to-grid
- Drag-and-drop or click-to-add node creation
- Edge-drop menu: drag from a handle to empty space to create a connected node
- Swipe file panel: import thumbnails from Notion or YouTube playlists
- Two AI models: Google Gemini (Nano Banana Pro 2) and Ideogram v3
- Undo/redo with Cmd+Z / Cmd+Shift+Z
- Right-click context menu for quick node creation
- Auto-save to Cloudflare D1 (optional)
- Image storage via Cloudflare R2 (optional)
- Simple password gate (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Gemini API key and/or an Ideogram API key

### Setup

```bash
# Clone the repo
git clone https://github.com/pat-pivot/thumbgen.git
cd thumbgen

# Install dependencies
npm install

# Copy the example env and add your API keys
cp .env.example .env.local

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

See `.env.example` for all available configuration. Only `GEMINI_API_KEY` or `IDEOGRAM_API_KEY` is required to start generating.

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes* | Google Gemini API key ([get one](https://aistudio.google.com/apikey)) |
| `IDEOGRAM_API_KEY` | Yes* | Ideogram v3 API key ([get one](https://ideogram.ai/manage-api)) |
| `NOTION_API_KEY` | No | Import swipe files from Notion |
| `YOUTUBE_API_KEY` | No | Import thumbnails from a YouTube playlist |
| `SITE_PASSWORD` | No | Simple auth gate |
| `R2_*` | No | Cloudflare R2 for persistent image storage |
| `D1_DATABASE_ID` | No | Cloudflare D1 for persistent project storage |

*At least one model API key is required.

### Deploy to Cloudflare

```bash
# Build and deploy
npm run deploy
```

Requires [Wrangler](https://developers.cloudflare.com/workers/wrangler/) to be authenticated. Environment variables should be set as secrets in your Cloudflare dashboard.

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **@xyflow/react** - Infinite canvas / node editor
- **Zustand** - State management
- **Tailwind CSS v4** - Styling
- **OpenNextJS + Cloudflare Workers** - Deployment
- **Cloudflare R2** - Image storage (optional)
- **Cloudflare D1** - Project persistence (optional)

## Importing a Swipe File from Notion

1. Create a Notion integration at [notion.so/profile/integrations](https://www.notion.so/profile/integrations)
2. Share your thumbnail database with the integration
3. Add your `NOTION_API_KEY` to `.env.local`
4. The swipe file panel will load your thumbnails automatically

## License

MIT
