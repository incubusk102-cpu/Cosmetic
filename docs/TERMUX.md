# Running Cosmetic Allergy Tracker on Termux (Android)

You have two paths. Pick the one that matches what you want to do.

---

## Path A — Preview just the marketing landing (≈10 MB, no Node)

The fastest way to see the landing page on your phone. No database, no
auth, no build step. Use this if you only want to look at the design.

1. **Install Termux.** Get it from
   [F-Droid](https://f-droid.org/en/packages/com.termux/) — the Play
   Store build is outdated. Open it once after install.

2. **Install Python and git.**
   ```sh
   pkg update -y
   pkg install -y python git
   ```

3. **Grant storage access** (so Termux can read files outside its
   sandbox if you ever want to). Run this once and tap *Allow* on the
   Android prompt:
   ```sh
   termux-setup-storage
   ```

4. **Clone the repo and serve the landing.**
   ```sh
   cd ~
   git clone https://github.com/incubusk102-cpu/Cosmetic.git
   cd Cosmetic/landing
   python -m http.server 8765
   ```

5. **Open it in your phone's browser** (Chrome, Firefox, anything):
   ```
   http://127.0.0.1:8765/
   ```
   Leave the Termux session open while you browse. `Ctrl+C` to stop
   the server.

The `landing/index.html` file is fully self-contained — no external
CDN, no Google Fonts, no analytics. It will render the same offline.

---

## Path B — Run the full Next.js app (≈400 MB, needs Node + Supabase)

Use this if you want the real app: scan, log, insights. You will need
your own Supabase project for auth and the database.

1. **Install Termux** (same as above, F-Droid build).

2. **Install Node.js 20 and git.** Termux ships Node 22+ by default,
   which works:
   ```sh
   pkg update -y
   pkg install -y nodejs-lts git
   node -v   # expect v20.x or newer
   ```

3. **Clone the repo and install deps.** Expect ~3–5 minutes on a
   reasonable connection:
   ```sh
   cd ~
   git clone https://github.com/incubusk102-cpu/Cosmetic.git
   cd Cosmetic
   npm install
   ```

   If `npm install` errors out compiling a native module (rare on
   Termux), try `pkg install -y python make clang` first and re-run.

4. **Set up your environment.** Copy the template and fill in the four
   secrets from your Supabase project's *Project settings → API* page:
   ```sh
   cp .env.example .env.local
   nano .env.local   # or `vi`, or whatever editor you prefer
   ```
   The required variables are documented in `.env.example`. At minimum
   you need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   and `SUPABASE_SERVICE_ROLE_KEY`.

5. **Run the database migrations.** Either paste the SQL files in
   `supabase/migrations/` into the Supabase SQL editor in order, or use
   the Supabase CLI if you have a paired remote project.

6. **Start the dev server, bound to all interfaces** so it's reachable
   from the phone's browser:
   ```sh
   npm run dev -- -H 0.0.0.0
   ```
   The default `next dev` binds to `localhost` only, which usually
   works on Termux because the phone *is* both client and server. The
   `-H 0.0.0.0` flag is here for the case where you want to reach the
   server from a *different* device on the same Wi-Fi (e.g. a laptop).

7. **Open the app:**
   ```
   http://127.0.0.1:3000/
   ```

---

## Tips for Termux on a phone

- **Wake-lock.** The OS will kill background processes aggressively.
  Run `termux-wake-lock` to keep the server alive when the screen is
  off; `termux-wake-unlock` when you're done.
- **Storage.** Termux's sandbox lives at
  `/data/data/com.termux/files/home`. Clones, logs, builds — everything
  goes there. If you run out of internal storage, `pkg uninstall` what
  you don't need and `rm -rf node_modules` between sessions.
- **Editing files from your phone's file manager.** After
  `termux-setup-storage`, your Termux home shows up as a normal folder
  in any modern file manager (Files by Google, Material Files, etc.).
  You can use Acode or Spck to edit the source comfortably.
- **Reaching the dev server from a desktop.** Find your phone's local
  IP with `ifconfig wlan0` (or `ip addr`), then visit
  `http://<phone-ip>:3000/` from a laptop on the same network. The
  `-H 0.0.0.0` flag in step 6 makes this work.
- **HTTPS.** Some browsers refuse the camera (for barcode scan) on
  plain HTTP from a non-localhost origin. If you load the app via
  phone IP from a laptop, use Path A for the static landing review
  instead, or set up a self-signed cert.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `python: command not found` | `pkg install -y python` |
| `git clone` hangs forever | Phone is offline or the carrier is throttling git. Try Wi-Fi. |
| `npm install` fails on `better-sqlite3` or similar native module | `pkg install -y python make clang` and re-run. |
| `next: command not found` after install | You're outside the repo. `cd ~/Cosmetic`. |
| Page loads but shows "Missing Supabase env" | You haven't filled in `.env.local`. |
| Page loads but `/scan`, `/insights` are 500 | Database migrations haven't been applied. |
| Server runs but nothing on `127.0.0.1:3000` | Try `0.0.0.0:3000` or `localhost:3000`. |

If you hit something not on this list, open an issue with the full
error and the output of `pkg list-installed | head -30`.
