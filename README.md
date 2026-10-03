# Swipe Down to Refresh

A Chrome extension that brings Safari's swipe-down-to-refresh gesture to Chrome on Mac. Swipe down with two fingers at the top of any page, and a Safari-style spinner appears while the page refreshes.

## Features

- Two-finger swipe down at the top of a page to refresh
- Safari-style 8-spoke spinner that fills in as you swipe
- Short swipes only nudge the page and spring back, so nothing reloads by accident
- Page movement is capped, so it never stretches far
- Works with light and dark pages
- Starts only when the page is already at the top, so normal scrolling is untouched
- No permissions, no tracking, no data collection

## Install

1. Download this repository (Code > Download ZIP) and unzip it, or clone it:
   ```
   git clone https://github.com/saimumarafat/swipe-down-refresh.git
   ```
2. Open `chrome://extensions` in Chrome
3. Turn on **Developer mode** (top right)
4. Click **Load unpacked** and select the project folder

Works in other Chromium browsers too (Edge, Brave, Arc).

## Usage

Scroll to the top of any page, then swipe down with two fingers on the trackpad and keep going without pausing. The spokes fill in as you swipe. When you reach the end, the spinner starts and the page refreshes. Stop early and the page springs back.

Natural scrolling (the macOS default) is expected.

## How it works

- A content script listens for trackpad wheel events and measures how far you swipe down at the top of the page.
- The page body is nudged down with a capped, eased movement, and a spinner is drawn in a closed shadow DOM so page styles cannot affect it.
- Once the swipe is long enough, the spinner starts while a fresh copy of the page downloads in the background. The page then settles back to rest and reloads from the fresh copy.
- Chrome freezes a page while it switches to the new one, so the spinner runs on the live page before the reload instead of across it.

## Settings

Edit the constants at the top of `content.js`:

| Constant | Default | What it does |
| --- | --- | --- |
| `TRIGGER_RAW` | 420 | Swipe length needed to refresh. Higher means a longer swipe. |
| `HOLD_OFFSET` | 70 | How far down the page moves, in pixels. |
| `BAND_SOFTNESS` | 170 | How quickly the page movement levels off. |
| `MIN_SPIN_MS` | 380 | Shortest time the spinner is shown. |

After editing, click the reload icon on the extension card at `chrome://extensions`, then refresh your open tabs.

## Limitations

- Does not run on `chrome://` pages, the Chrome Web Store, or the PDF viewer, because Chrome blocks extensions there.
- Only runs in the top frame of a page, not in embedded frames.
- Pages that use unusual fixed layouts may look slightly different while the page is pulled.
- The fresh copy is requested with a normal GET, so pages that were loaded by a form POST are reloaded the normal way.

## Privacy

This extension does not collect, store, or send any data. It requests only the current page's own address, from your browser, to refresh it.

## License

MIT
