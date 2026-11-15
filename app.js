import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup,
  updateProfile, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where,
  orderBy, onSnapshot, serverTimestamp, updateDoc, limit, getDocs
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// This is the Firebase Web App config supplied for project my-chat-fe03c.
const firebaseConfig = {
  apiKey: "AIzaSyAZuztq5bPb0uCSe8AiVd4L3k9Mr11RGEE",
  authDomain: "my-chat-fe03c.firebaseapp.com",
  projectId: "my-chat-fe03c",
  storageBucket: "my-chat-fe03c.firebasestorage.app",
  messagingSenderId: "488034063036",
  appId: "1:488034063036:web:69ad1c88847440534a36b9",
  measurementId: "G-658VRYYFVH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);
let mode = "login", currentUser = null, activeChatId = null;
let stopChats = null, stopMessages = null, chatsCache = [];

function toast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function setMessage(id, message, good=false) {
  const el = $(id); el.textContent = message; el.style.color = good ? "#62d6b0" : "#ff9baf";
}
function initials(name="M") { return name.trim().slice(0,1).toUpperCase() || "M"; }
function safeText(value="") { return String(value); }
function setMode(next) {
  mode = next;
  $("loginTab").classList.toggle("active", mode === "login");
  $("signupTab").classList.toggle("active", mode === "signup");
  $("nameWrap").classList.toggle("hidden", mode !== "signup");
  $("authSubmit").textContent = mode === "login" ? "Log in" : "Create account";
  $("password").autocomplete = mode === "login" ? "current-password" : "new-password";
  setMessage("authMessage", "");
}
$("loginTab").addEventListener("click", () => setMode("login"));
$("signupTab").addEventListener("click", () => setMode("signup"));

async function saveUserProfile(user) {
  const ref = doc(db, "users", user.uid);
  await setDoc(ref, {
    uid: user.uid, displayName: user.displayName || user.email?.split("@")[0] || "MyChat user",
    email: (user.email || "").toLowerCase(), photoURL: user.photoURL || "",
    updatedAt: serverTimestamp()
  }, { merge: true });
}
async function ensureProfile(user) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) await saveUserProfile(user);
}
$("authForm").addEventListener("submit", async (event) => {
  event.preventDefault(); setMessage("authMessage", "Please wait…", true);
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  try {
    if (mode === "signup") {
      const name = $("displayName").value.trim();
      if (!name) throw new Error("Please enter your display name.");
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: name });
      await saveUserProfile(result.user);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) { setMessage("authMessage", error.message); }
});
$("googleBtn").addEventListener("click", async () => {
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (error) { setMessage("authMessage", error.message); }
});
$("signOutBtn").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  $("authView").classList.toggle("hidden", !!user);
  $("appView").classList.toggle("hidden", !user);
  if (!user) {
    if (stopChats) stopChats(); if (stopMessages) stopMessages();
    activeChatId = null; return;
  }
  try { await ensureProfile(user); } catch (e) { toast("Profile setup: " + e.message); }
  $("myName").textContent = user.displayName || "MyChat user";
  $("myEmail").textContent = user.email || "";
  $("myAvatar").textContent = initials(user.displayName || user.email);
  listenForChats();
});

function listenForChats() {
  if (stopChats) stopChats();
  const q = query(collection(db, "chats"), where("members", "array-contains", currentUser.uid));
  stopChats = onSnapshot(q, async (snapshot) => {
    const rows = await Promise.all(snapshot.docs.map(async (chatDoc) => {
      const data = chatDoc.data();
      const peerId = (data.members || []).find(id => id !== currentUser.uid);
      let peer = { displayName: "MyChat user", email: "" };
      if (peerId) {
        const peerSnap = await getDoc(doc(db, "users", peerId));
        if (peerSnap.exists()) peer = peerSnap.data();
      }
      return { id: chatDoc.id, ...data, peerId, peer };
    }));
    rows.sort((a,b) => (b.updatedAt?.toMillis?.() || 0) - (a.updatedAt?.toMillis?.() || 0));
    chatsCache = rows; renderChatList();
  }, (error) => toast("Chat list error: " + error.message));
}
function renderChatList() {
  const list = $("chatList"); list.innerHTML = "";
  if (!chatsCache.length) {
    list.innerHTML = '<div class="empty-hint">No chats yet.<br>Press ＋ New to begin.</div>'; return;
  }
  chatsCache.forEach(chat => {
    const button = document.createElement("button");
    button.className = "chat-item" + (activeChatId === chat.id ? " active" : "");
    const avatar = document.createElement("div"); avatar.className = "avatar";
    avatar.textContent = initials(chat.peer.displayName || chat.peer.email);
    const copy = document.createElement("div"); copy.className = "chat-item-copy";
    const name = document.createElement("strong"); name.textContent = chat.peer.displayName || chat.peer.email || "MyChat user";
    const preview = document.createElement("span"); preview.textContent = chat.lastMessage || "Start chatting";
    copy.append(name, preview); button.append(avatar, copy);
    button.addEventListener("click", () => openChat(chat.id));
    list.append(button);
  });
}
async function openChat(chatId) {
  activeChatId = chatId; renderChatList();
  const chat = chatsCache.find(c => c.id === chatId);
  if (!chat) return;
  $("welcomePane").classList.add("hidden"); $("chatPane").classList.remove("hidden");
  $("peerName").textContent = chat.peer.displayName || chat.peer.email || "MyChat user";
  $("peerStatus").textContent = chat.peer.email || "MyChat";
  $("peerAvatar").textContent = initials(chat.peer.displayName || chat.peer.email);
  if (stopMessages) stopMessages();
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(300));
  stopMessages = onSnapshot(q, (snapshot) => {
    const container = $("messages"); container.innerHTML = "";
    if (snapshot.empty) { container.innerHTML = '<div class="empty-hint">Say hello and start the conversation.</div>'; return; }
    snapshot.forEach(messageDoc => {
      const msg = messageDoc.data();
      const mine = msg.senderId === currentUser.uid;
      const row = document.createElement("div"); row.className = "bubble-row" + (mine ? " mine" : "");
      const bubble = document.createElement("div"); bubble.className = "bubble";
      const body = document.createElement("div"); body.textContent = safeText(msg.text);
      const time = document.createElement("small");
      time.textContent = msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"}) : "Sending…";
      bubble.append(body, time); row.append(bubble); container.append(row);
    });
    container.scrollTop = container.scrollHeight;
  }, error => toast("Message error: " + error.message));
}
$("messageForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = $("messageInput").value.trim();
  if (!text || !activeChatId || !currentUser) return;
  $("messageInput").value = "";
  try {
    await addDoc(collection(db, "chats", activeChatId, "messages"), {
      text, senderId: currentUser.uid, createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, "chats", activeChatId), {
      lastMessage: text.slice(0, 120), updatedAt: serverTimestamp()
    });
  } catch (error) { $("messageInput").value = text; toast("Could not send: " + error.message); }
});

function showNewChat() {
  $("newChatMessage").textContent = ""; $("peerEmail").value = "";
  $("newChatDialog").showModal(); $("peerEmail").focus();
}
$("newChatBtn").addEventListener("click", showNewChat);
$("welcomeNewChat").addEventListener("click", showNewChat);
$("closeDialog").addEventListener("click", () => $("newChatDialog").close());
$("newChatForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("peerEmail").value.trim().toLowerCase();
  if (!email || !currentUser) return;
  setMessage("newChatMessage", "Searching…", true);
  try {
    const users = await getDocs(query(collection(db, "users"), where("email", "==", email)));
    const peerDoc = users.docs.find(d => d.id !== currentUser.uid);
    if (!peerDoc) { setMessage("newChatMessage", "No MyChat account found with that email."); return; }
    const peerId = peerDoc.id;
    const existing = chatsCache.find(c => (c.members || []).includes(peerId));
    if (existing) { $("newChatDialog").close(); await openChat(existing.id); return; }
    const chatRef = await addDoc(collection(db, "chats"), {
      members: [currentUser.uid, peerId].sort(), createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(), lastMessage: ""
    });
    $("newChatDialog").close();
    // The realtime listener will add the new chat; open it after the listener updates.
    setTimeout(() => openChat(chatRef.id), 500);
  } catch (error) { setMessage("newChatMessage", error.message); }
});
