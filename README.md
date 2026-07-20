# Manacat PostPilot

Aplicație desktop pentru echipa Manacat — compune postări pentru Facebook direct din produsele magazinului, fără Photoshop și fără copy-paste manual.

PostPilot acoperă trei tipuri de conținut: **promovare produs** (graphic cu preț, poză și caracteristici), **anunț magazin** (program, reduceri, evenimente) și **anunț angajări**. Editorul lucrează pe template-uri Manacat; la final, postarea pleacă pe pagina de Facebook prin API-ul intern.

Disponibil pe **Windows**, cu actualizări automate după instalare.

## Descărcare

Instalatorul este în [Releases](https://github.com/Crisstians/manacat-postPilot/releases/latest).

## Dezvoltare locală

Cerințe: Node.js 22, npm.

```bash
npm ci
npm run dev
```

Pornește Vite pe portul 5180 și Electron cu hot reload. Pentru build de producție:

```bash
npm run build:app
```

## Structură

```
electron/          Proces principal, IPC, auto-updater
src/renderer/      Interfață React
src/services/      Compunere imagini, caption, API
src/shared/        Tipuri, draft-uri, logică comună
```

Backend-ul (autentificare, publicare Facebook) rulează separat pe Railway. Aplicația se conectează la el la login; URL-ul implicit e configurat în `src/config/api.ts`.

## Scripturi utile

| Comandă | Ce face |
|---|---|
| `npm run dev` | Dev cu Electron + Vite |
| `npm run build:app` | Build local + instalator |
| `npm run test` | Teste (Vitest) |
| `npm run lint` | Oxlint |

## Licență

Proprietate Manacat. Cod sursă public pentru transparență; utilizarea aplicației este rezervată echipei autorizate.
