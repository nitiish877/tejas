# Tejas AI — Frontend

Live: https://tejassai.vercel.app

Tejas AI Frontend is a production-grade single-page application that provides the user-facing interface for the Tejas AI platform. It includes chat UI, authentication, file and image handling, subscription flows, and integration with the Tossive VS Code extension.

## Key technologies
- React + TypeScript
- Vite
- Tailwind CSS
- Firebase (client) for social authentication
- PWA support and file handling

## Features
- Real-time chat UI with streaming responses
- Guest and authenticated user modes
- File and image attachments with parsing and upload support
- Shareable public chat links
- Subscription and payment workflows
- Tossive VS Code extension integration for editor workflows

## Main Code Editor Integration
This project includes a VS Code extension source under the `tossive-vsix-source` folder. The Tossive extension allows users to:
- Authenticate an editor session with Tejas
- Open an in-editor Tejas assistant panel
- Share selections and request code-focused assistance

## Prerequisites
- Node.js 18+
- npm or a compatible package manager
- Firebase project configuration (optional, if using Firebase auth)
- A deployed backend API that is reachable by the frontend

## Local development
1. Clone the repository:
   ```bash
   git clone https://github.com/nitiish877/tejas.git
   cd tejas
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables
Create a `.env.local` file in the project root and add values such as:

```bash
VITE_FIREBASE_API_KEY="..."
VITE_FIREBASE_AUTH_DOMAIN="..."
VITE_FIREBASE_PROJECT_ID="..."
VITE_FIREBASE_STORAGE_BUCKET="..."
VITE_FIREBASE_MESSAGING_SENDER_ID="..."
VITE_FIREBASE_APP_ID="..."
VITE_PUBLIC_SITE_URL="https://tejassai.vercel.app"
```

Notes:
- Firebase keys are required only if you enable social sign-in.
- The frontend can also be configured to use a custom backend URL in the app settings or via deployment environment configuration.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Preview the production build locally:
   ```bash
   npm run preview
   ```

## Deployment
### Vercel
1. Import the project into Vercel.
2. Set the build command:
   ```bash
   npm run build
   ```
3. Set the output directory:
   ```bash
   dist
   ```
4. Add environment variables in the Vercel dashboard:
   - `VITE_FIREBASE_*`
   - `VITE_PUBLIC_SITE_URL`

### Netlify
1. Import the project to Netlify.
2. Set the build command:
   ```bash
   npm run build
   ```
3. Set the publish directory:
   ```bash
   dist
   ```
4. Add the same environment variables in Netlify settings.

## Backend configuration
The frontend communicates with the Tejas backend through the configured backend URL. If the backend is not reachable, some features may fail.

Set the backend URL in the app settings or configure it via your deployment environment. Ensure the backend allows the frontend origin via CORS.

## Project layout
```bash
.
├── src/
│   ├── App.tsx                 # main application
│   ├── main.tsx
│   ├── firebaseClient.ts       # Firebase client helpers
│   ├── components/             # UI components
│   ├── utils/                  # helpers, sync logic, attachments
│   └── types.ts
├── public/
├── tossive-vsix-source/        # Tossive VS Code extension source
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── README.md
└── .gitignore
```

## Troubleshooting
- Firebase sign-in fails: verify Firebase environment variables and OAuth redirect URIs.
- Backend connection issues: confirm the correct backend URL is configured.
- Share links not working: ensure the backend share endpoints are active.
- Build issues: run `npm run build` locally before deploying.

## Security and best practices
- Never commit secrets to the repository.
- Use host secret management for environment variables.
- Serve the site over HTTPS in production.
- Keep `VITE_PUBLIC_SITE_URL` accurate to avoid OAuth mismatches.

## License
Add a proper license before public release if you intend to distribute the project more broadly.

---

## Publishing checklist
Before publishing:
- [ ] Add all required environment variables
- [ ] Validate `npm run build`
- [ ] Verify backend URL and CORS settings
- [ ] Confirm Firebase config is valid
- [ ] Add LICENSE
- [ ] Add `.env.example`
- [ ] Ensure no secrets are committed
