# Infopark Internship Calling Tracker

A production-ready, real-time web application built for **Aibin, Milan, Edwin, Seba, and Lakshmi** (Saintgits MCA) to track and coordinate internship outreach across **208 companies in Infopark Kochi Phase 1**.

This private workspace allows the five friends to call companies from their mobile phones, mark call statuses in real time, and view live team progress without duplicate calls.

---

## 1. Key Features & Highlights

- **Live Multi-Device Sync**: When any teammate marks a company as contacted on their phone, every other connected teammate sees the update, caller attribution, and timestamp live across devices without refreshing.
- **Click-to-Call on Android & iPhone**: Formatted RFC 3966 `tel:` links on every contact number for one-tap calling in native mobile dialers, plus an instant one-tap copy button.
- **Duplicate Call Prevention**: Uses PostgreSQL atomic row-locking transactions (`SELECT ... FOR UPDATE`) in `mark_company_contacted` so two teammates can never accidentally call or claim the same company simultaneously.
- **Simple 1-Click Teammate Login**: No registration and no tedious Google API configuration needed. Both username and password are the student's name (`Aibin`, `Milan`, `Edwin`, `Seba`, `Lakshmi`), plus 1-click quick-access buttons on the login screen.
- **100% Verified Excel Import**: All **208 companies and contact numbers** from `Infopark_Kochi_Phase_1_Companies_With_Numbers.xlsx` are imported with exact names, original phone number formatting, and display serial numbers (1 to 208).
- **Optimized for Mobile & Desktop**: Vertical cards with large 44px+ touch targets on Android & iPhones, high-density sticky table on desktop with pagination and smooth scroll-to-top.
- **Live Outreach Dashboard**: Real-time summary cards calculating Total (208), Contacted count, Remaining count, Progress percentage, and individual outreach breakdown.

---

## 2. Technology Stack

- **Frontend**: Next.js 16 (App Router) & React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase PostgreSQL (with atomic row-locking functions)
- **Live Synchronization**: Supabase Realtime (`postgres_changes` subscriptions & multi-client broadcast)
- **Authentication**: Teammate session credentials with 30-day persistent cookie
- **Excel Processing**: SheetJS (`xlsx`)
- **Hosting**: Vercel

---

## 3. The 5 Authorized Team Accounts

The workspace is private and pre-configured for the 5 Saintgits MCA teammates:

| Teammate | Username / Email | Password | Mobile 1-Click |
| :--- | :--- | :--- | :--- |
| **Aibin** | `Aibin` *(or `aibinj.mca2527@saintgits.org`)* | `Aibin` | Yes |
| **Milan** | `Milan` *(or `milans.mca2527@saintgits.org`)* | `Milan` | Yes |
| **Edwin** | `Edwin` *(or `edwinj.mca2527@saintgits.org`)* | `Edwin` | Yes |
| **Seba** | `Seba` *(or `sebamt.mca2527@saintgits.org`)* | `Seba` | Yes |
| **Lakshmi** | `Lakshmi` *(or `lakshmis.mca2527@saintgits.org`)* | `Lakshmi` | Yes |

---

## 4. Database Setup & Architecture

### Database Tables:
1. **`approved_team_members`**: Pre-seeded with the 5 students (Aibin, Milan, Edwin, Seba, Lakshmi).
2. **`companies`**: Holds all 208 companies, serial numbers (`#1` to `#208`), exact phone numbers, contact status (`NOT_CONTACTED` / `CONTACTED`), caller name, and contact timestamp.
3. **`contact_history`**: Audit trail recording every contact or status reset with user attribution and timestamp.

### One-Click Database Deployment (Supabase SQL Editor)
The entire database schema, security policies, atomic stored procedures, and 208 seeded companies are consolidated into:
```
supabase/schema.sql
```

1. Open your project on [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to the **SQL Editor** tab on the left menu.
3. Open or copy the entire contents of `supabase/schema.sql` into the editor.
4. Click **Run**.
5. All tables, atomic functions, Realtime publications, and all 208 companies will be created and seeded idempotently.

---

## 5. Easy Vercel Deployment (So Any Teammate Can Access Anywhere)

Deploying to Vercel takes less than 2 minutes and gives you a free live URL (e.g. `https://internship-calling-tracker.vercel.app`) that all 5 friends can open on their phones:

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Production-ready Infopark Calling Tracker"
git branch -M main
git remote add origin https://github.com/aibinjmca2527-dotcom/Internship-Calling-Tracker.git
git push -u origin main
```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com) (sign in with your GitHub account).
2. Click **Add New...** &rarr; **Project**.
3. Select the repository: **`aibinjmca2527-dotcom/Internship-Calling-Tracker`**.
4. Framework Preset will automatically detect **Next.js**.

### Step 3: Add Environment Variables
In the **Environment Variables** section on Vercel, add:
- `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase project URL (e.g. `https://xyz.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your Supabase anon public key
- `SUPABASE_SERVICE_ROLE_KEY` = Your Supabase service role key

*(If you haven't set up Supabase yet, the website will still run with built-in instant local storage sync across all 208 companies!)*

### Step 4: Click Deploy
Click **Deploy**. In under a minute, Vercel will give you a live production link. Share this link with Milan, Edwin, Seba, and Lakshmi on WhatsApp so everyone can start calling immediately!

---

## 6. Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Verification & Acceptance Checklist

| Requirement | Implementation Detail | Status |
| :--- | :--- | :---: |
| **Excel Ingestion** | All 208 companies & numbers extracted from `Infopark_Kochi_Phase_1_Companies_With_Numbers.xlsx`. | Verified |
| **Blank Filtering** | Zero missing numbers or blank entries. | Verified |
| **Click-to-Call** | RFC 3966 `tel:` links opening phone dialer on Android and iPhone. | Verified |
| **No Auto-mark** | Opening dialer never automatically marks company as contacted. | Verified |
| **5 Teammates Login** | Simple name/password sign-in and 1-click access for Aibin, Milan, Edwin, Seba, Lakshmi. | Verified |
| **Atomic Overwrite Protection** | `mark_company_contacted` uses `SELECT FOR UPDATE` to reject duplicate claims. | Verified |
| **Realtime Sync** | Supabase Realtime channel broadcasts updates live to all 5 devices. | Verified |
| **Live Summary Cards** | Dynamic counts (Total, Contacted, Remaining, %) updating immediately. | Verified |
| **Status Reversal** | Reset to Not Contacted action with confirmation and audit history logging. | Verified |
| **Mobile & Desktop** | High-density desktop table & responsive mobile cards for Android/iOS. | Verified |
| **Production Build** | `npm run build` succeeds cleanly with Turbopack and static page generation. | Verified |
