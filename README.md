# RelatieCRM — Stichting Relatiebeheer

Een relatiebeheer-CRM (contacten, organisaties, pipeline/kansen, taken en een
dashboard) gebouwd met Next.js + Supabase.

## Wat zit erin

- **Contacten & organisaties** — CRUD, zoeken/filteren, contactpersonen per organisatie
- **Contactmomenten** — tijdlijn per contact/organisatie (bellen, e-mail, afspraak, notitie, evenement, gift)
- **Pipeline** — sleepbaar kanban-bord voor kansen (subsidieaanvragen, donaties, samenwerkingen)
- **Taken & follow-ups** — met deadline, prioriteit en koppeling aan contact/organisatie/kans
- **Dashboard** — kerncijfers en grafieken (pipeline-waarde per fase, contactmomenten per maand)
- **Login/registratie** via Supabase Auth (e-mail + wachtwoord), gedeeld team-account (RLS: elke ingelogde gebruiker ziet alle data)

## Techniek

- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- Supabase (Postgres, Auth, Row Level Security)
- @dnd-kit voor het sleepbare pipeline-bord
- Recharts voor de dashboard-grafieken

## Supabase-project

Dit project is al gekoppeld aan een live Supabase-database (organisatie **road
stichtingen**, project **gospel stichtingen**). De `.env.production` bevat de
project-URL en de publieke (anon) API-sleutel — dit is veilig om mee te
deployen, want alle toegang loopt via Row Level Security-policies.

Het datamodel (tabellen `organizations`, `contacts`, `tags`, `interactions`,
`pipeline_stages`, `deals`, `tasks`, `profiles`) en de standaard pipeline-fases
en tags staan al klaar in de database.

## Lokaal draaien

```bash
npm install
npm run dev
```

Ga naar `http://localhost:3000`, maak een account aan via "Account maken" en
log in.

## Live zetten (Vercel)

Jullie Vercel-account (team **aleph**) is al gekoppeld. Twee manieren:

**Optie A — Vercel CLI (snelst):**
```bash
npm install -g vercel
vercel login
vercel --prod
```
Vercel detecteert automatisch dat het een Next.js-project is en de
omgevingsvariabelen uit `.env.production` worden bij de build ingelezen.

**Optie B — via de Vercel-dashboard:**
Ga naar vercel.com → New Project → Import, sleep deze map (of een GitHub-repo
met deze code) erin, en klik Deploy.

## Volgende stappen / uitbreidingen

Dit is een stevige basis, geen 1-op-1 kopie van Zoho — voor verdere
uitbreiding kun je denken aan: e-mailintegratie (verzenden vanuit de app),
geautomatiseerde herinneringen, export naar Excel/CSV, gebruikersrollen en
rechten, en een activiteitenlog per gebruiker.
