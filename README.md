# Emporium POC

Reviewable frontend proof of concept for Emporium.

Emporium is a regional cloud file-storage, synchronisation, and sharing platform. This POC validates the web experience and product flows only; it does not implement production storage, authentication, or regional infrastructure.

## Stack

- Vue 3
- Vite
- GitHub Pages
- Browser-local mock API/data
- Playwright smoke tests for mobile, tablet, and desktop

## Branch workflow

- `main` is the current reviewable version deployed to GitHub Pages.
- `edition-X` branches preserve reviewed editions.

## POC scope

Initial flows:

- Personal and organisation storage spaces
- File/folder browsing
- Search
- Upload interaction (mock)
- Sharing interaction (mock)
- Region/authority visibility
- Recent, shared and trash views
- Responsive mobile/tablet/desktop shell

## Development

```bash
npm install
npm run dev
```

## Test

```bash
npm run build
npm run test:e2e
```
