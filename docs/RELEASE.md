# Release și semnare PostPilot

## Release standard

```bash
# 1. Actualizează versiunea în package.json (ex: 1.0.5)
git add .
git commit -m "Release v1.0.5"
git push

# 2. Creează tag (versiunea din package.json trebuie să coincidă)
git tag v1.0.5
git push origin v1.0.5
```

Dacă release-ul nu apare, verifică **GitHub → Actions → Release** (job roșu = build eșuat).

Dacă vezi eroare `secondary rate limit`, așteaptă **10-15 minute** înainte de re-run (prea multe request-uri API într-un interval scurt).

În **Settings → Actions → General → Workflow permissions**, setează **Read and write permissions**.

Pentru re-run manual: **Actions → Release → Run workflow**.

GitHub Actions construiește automat:
- macOS: `.dmg`
- Windows: `.exe` (NSIS)

Artefactele apar în **GitHub Releases**.

## Semnare macOS (recomandat pentru producție)

### Cerințe

- Apple Developer Program
- Certificat **Developer ID Application**
- Fișier `.p12` exportat din Keychain

### Secrets GitHub (Repository → Settings → Secrets)

| Secret | Descriere |
|---|---|
| `CSC_LINK` | Certificat `.p12` encodat base64 |
| `CSC_KEY_PASSWORD` | Parola certificatului |
| `APPLE_ID` | Apple ID folosit pentru notarizare |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | Team ID din Apple Developer |

### Generare `CSC_LINK`

```bash
base64 -i certificate.p12 | pbcopy
```

Lipește conținutul în secretul `CSC_LINK`.

Când aceste secrets există, workflow-ul semnează și notarizează automat build-ul macOS.

## Semnare Windows (opțional)

Folosește același certificat code signing (`.p12`) sau unul dedicat Windows:

| Secret | Descriere |
|---|---|
| `CSC_LINK` | Certificat encodat base64 |
| `CSC_KEY_PASSWORD` | Parola certificatului |

Dacă secrets lipsesc, build-ul continuă **nesemnat** (util pentru test intern).

## Build local

```bash
npm run build:app
```

Instalatoarele apar în folderul `release/`.

## Distribuire către angajați

Trimite linkul către ultimul release GitHub și ghidul `docs/INSTALARE.md`.
