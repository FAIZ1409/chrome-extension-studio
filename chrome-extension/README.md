# YouTube Focus Mode - Chrome Extension

A Chrome Extension (Manifest V3) that transforms YouTube into a distraction-free, productivity-focused learning platform.

## Features

- ✅ **Content Filtering** - Hides entertainment videos, shows only educational content
- ✅ **Focus Mode Dashboard** - Replaces homepage with motivational UI
- ✅ **Keyword Management** - Add/remove allowed and blocked keywords
- ✅ **Pomodoro Timer** - Built-in focus timer with presets
- ✅ **Daily Stats** - Track educational time, blocked videos, and streaks
- ✅ **Smart Notifications** - Reminders when accessing blocked content

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. Visit YouTube to see it in action!

## Folder Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
├── content/
│   ├── content.js         # DOM manipulation on YouTube
│   └── content.css        # Injected styles
├── background/
│   └── background.js      # Service worker for state/notifications
└── icons/                 # Extension icons (add 16x16, 48x48, 128x128 PNGs)
```

## How Filtering Works

1. **Blocked Keywords**: Videos with titles/channels containing these words are hidden (prank, vlog, gaming, etc.)
2. **Allowed Keywords**: Videos matching these are marked as educational (tutorial, coding, python, etc.)
3. **Shorts**: All YouTube Shorts are automatically hidden

## Adding Icons

Add PNG icons to the `icons/` folder:
- `icon16.png` (16x16)
- `icon48.png` (48x48)
- `icon128.png` (128x128)

## License

MIT - Built for educational purposes
