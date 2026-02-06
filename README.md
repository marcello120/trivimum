# Trivimum

A real-time, mobile-first quiz application built with Next.js, Firebase, and TypeScript. Perfect for interactive quizzes, classroom activities, and team building events.

## Features

- 🎯 **Real-time multiplayer** - Multiple players can join and play simultaneously
- 📱 **Mobile-first design** - Optimized for smartphones and tablets
- 🎨 **Multiple question types** - Multiple choice (MCQ) and text input questions
- 🧠 **Smart text matching** - Fuzzy matching allows for small typos in text answers
- 👀 **Live typing preview** - Admin can see what players are typing in real-time
- 📊 **Automatic scoring** - Points awarded instantly for correct answers
- 🎮 **Admin controls** - Host can control game flow, reveal answers, and show leaderboards
- 💾 **Persistent sessions** - Players keep their identity across browser sessions

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable **Realtime Database** (not Firestore)
3. Set database rules to allow read/write (for development):
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
4. Get your web app configuration from Project Settings
5. Update `.env.local` with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project_id-default-rtdb.firebaseio.com/
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## How to Use

### For Players
1. Visit the main page: `http://localhost:3000`
2. Enter your name to join the game
3. Wait in the lobby for the host to start questions
4. Answer questions by clicking buttons (MCQ) or typing (text questions)
5. See your score after each question

### For Admin/Host
1. Visit the admin page: `http://localhost:3000/admin?code=admin123`
2. Monitor connected players in real-time
3. Use control buttons to manage the game:
   - **Start Question** - Begin the current question
   - **Reveal Answer** - Show correct answer and update scores
   - **Next Question** - Move to the next question
   - **Show Leaderboard** - Display current standings
   - **Reset Game** - Clear all data and restart

## Adding Custom Questions

Edit `src/lib/questions.ts` to add your own questions:

```typescript
export const QUESTIONS: Question[] = [
  {
    id: 1,
    text: "What is the capital of Japan?",
    type: 'TEXT',
    correctAnswer: ['Tokyo', 'Tokio'] // Multiple valid answers
  },
  {
    id: 2,
    text: "Which of these is a programming language?",
    type: 'MCQ',
    options: ['Python', 'Snake', 'Cobra', 'Viper'],
    correctAnswer: 'Python'
  }
];
```

### Question Types

- **MCQ (Multiple Choice)**: 4 colored buttons, exact match required
- **TEXT**: Free text input with fuzzy matching (tolerates 1-character typos)

## Deployment

### Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Build the project: `pnpm build`
3. Deploy: `vercel`
4. Add environment variables in Vercel dashboard

### Other Hosting Platforms

This is a standard Next.js app and can be deployed on:
- Netlify
- Railway
- AWS Amplify
- Any Node.js hosting platform

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   └── page.tsx          # Admin control panel
│   ├── globals.css           # Global styles
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main player interface
├── components/
│   ├── GameScreen.tsx       # Game UI for players
│   └── LoginScreen.tsx      # Name entry screen
├── lib/
│   ├── firebase.ts          # Firebase configuration
│   ├── questions.ts         # Quiz questions data
│   └── utils.ts             # Utility functions
└── types.ts                 # TypeScript type definitions
```

## Technical Details

- **Framework**: Next.js 14+ with App Router
- **Database**: Firebase Realtime Database
- **Styling**: Tailwind CSS
- **State Management**: React hooks + Firebase subscriptions
- **Text Matching**: Levenshtein distance algorithm
- **Real-time Updates**: Firebase onValue listeners

## Troubleshooting

### Common Issues

1. **Firebase connection errors**: Check your `.env.local` file and Firebase project settings
2. **Players not appearing**: Verify Firebase Realtime Database rules allow writes
3. **Live typing not working**: Ensure you're using Realtime Database (not Firestore)
4. **Admin page access denied**: Make sure to add `?code=admin123` to the URL

### Development Tips

- Open browser dev tools to see Firebase connection status
- Check the Network tab for Firebase API calls
- Use Firebase Console to inspect database structure in real-time

## License

MIT License - Feel free to use this project for educational or commercial purposes.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

Enjoy your quiz game! 🎉