Open http://localhost:3000

## API
- `GET /api/verse?ref=John 3:16` → exact KJV text
- `POST /api/journal` { text } → saves if it passes guard
- `GET /api/journal` → list entries
- `POST /api/check` { text } → Christ Test { ok, reason }
- `POST /api/printables/week` { week, theme, refs[] } → HTML
- `POST /api/printables/week.pdf` { week, theme, refs[] } → PDF download

**Integrity**: Scripture is stored in `server/src/scripture-kjv.json`. You can lock it with a SHA-256 later.
