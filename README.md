# AURA Final Demo

## Frontend

From the project root:

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal.

## AI backend

Open a second terminal:

```bash
cd server
npm install
```

Create `server/.env`:

```env
GROQ_API_KEY=YOUR_GROQ_API_KEY
```

Then run:

```bash
npm start
```

The AI server runs on `http://localhost:5000`.

## Demo OTP

Use:

`123456`

## Important

The frontend treats Firestore as best-effort so the demo does not break if Firestore rules reject a write. Local browser storage keeps the demo stats usable. For real deployment, configure Firebase Authentication/Firestore security rules instead of relying on demo behavior.
