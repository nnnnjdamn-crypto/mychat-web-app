# MyChat Web

A responsive Firebase-powered web chat for the Firebase project `my-chat-fe03c`.

## Included
- Email/password sign up and login
- Google sign-in
- User profile documents in Firestore
- Find another MyChat user by their exact account email
- Real-time private one-to-one text messaging
- Responsive dark interface for desktop and mobile
- Firestore security rules and Firebase Hosting configuration

## Important setup

1. Open the [Firebase Console](https://console.firebase.google.com/) and select `my-chat-fe03c`.
2. In **Authentication → Sign-in method**, enable **Email/Password** and **Google**.
3. In **Firestore Database**, create a database if one does not exist.
4. In **Firestore → Rules**, publish the included `firestore.rules`.
5. For Google sign-in, add your deployed domain under **Authentication → Settings → Authorized domains**.
6. Serve the folder from a local web server or deploy it with Firebase Hosting. Do not open `index.html` directly as a `file://` URL because browser module imports require a web server.

## Run locally

If Python is installed, open a terminal in this folder and run:

```bash
py -m http.server 5500
```

Then open `http://localhost:5500`.

## Deploy to Firebase Hosting

Install Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

From this folder:

```bash
firebase use my-chat-fe03c
firebase deploy
```

The included `.firebaserc` already selects `my-chat-fe03c`.

## How to start a chat

Both people must first create MyChat accounts. Click **＋ New** and enter the exact email address the other person used to register. Then send messages in real time.

## Security notes

- The Firebase Web API key is client-side project configuration, not a server secret. Firebase Authentication and Firestore Security Rules are the security boundary.
- The supplied rules allow signed-in users to read basic user profile documents so account lookup by email can work. Do not store private information in `users` documents.
- Test rules in the Firebase Emulator Suite before production use. Review your Firebase project's authorized domains, usage limits, and billing settings.
- This version provides text chat. It does not yet include voice messages, calls, push notifications, or end-to-end encryption.
