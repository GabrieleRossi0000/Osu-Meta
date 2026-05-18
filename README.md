# Osu Meta

Bulk-edit osu! beatmap metadata (artist, title, tags) across **all difficulties** in a set from one screen.

Releases: [GabrieleRossi0000/Osu-Meta-](https://github.com/GabrieleRossi0000/Osu-Meta-/releases)

## Install

1. Download the latest **Osu Meta** installer or portable `.exe` from [GitHub Releases](https://github.com/GabrieleRossi0000/Osu-Meta-/releases).
2. Run the app and select your osu! **Songs** folder on first launch (auto-detected for stable and lazer when possible).

## Usage

1. Pick a beatmap set from the list (search by artist, title, or folder name).
2. Edit:
   - **Artist name** → `ArtistUnicode`
   - **Romanized artist name** → `Artist`
   - **Song title** → `TitleUnicode`
   - **Romanized song title** → `Title`
   - **Tags** → `Tags`
3. Click **Save to all difficulties** — every `.osu` file in that folder is updated.

Close osu! before saving so the client does not overwrite your edits.

## Development

```bash
npm install
npm run dev
```

Build Windows installer:

```bash
npm run dist
```

## Releasing

Push a version tag to trigger the GitHub Actions release workflow:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Artifacts are uploaded to GitHub Releases automatically.

## Data

No database. The app only stores your Songs folder path locally (`electron-store`).
