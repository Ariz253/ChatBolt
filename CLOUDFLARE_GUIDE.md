# Cloudflare Tunnel Setup for ChatBolt

Follow these steps to share your application with a friend.

## 🔹 1. Start your backend (Node server)
Open a terminal in the `server` folder:
```powershell
node index.js
```
Make sure it says: **SERVER RUNNING**

## 🔹 2. Start your frontend (React)
Open a terminal in the `client` folder:
```powershell
npm start
```
Make sure it opens: http://localhost:3000

## 🔹 3. Start Cloudflare tunnel for BACKEND
Open a **new terminal**:
```powershell
& "C:\Program Files\cloudflared\cloudflared.exe" tunnel --url http://localhost:3001
```
You will get a URL like `https://something.trycloudflare.com`.
📌 **Copy this — this is your BACKEND URL.**

## 🔹 4. Start Cloudflare tunnel for FRONTEND
Open **another new terminal**:
```powershell
& "C:\Program Files\cloudflared\cloudflared.exe" tunnel --url http://localhost:3000
```
You will get another URL like `https://something-else.trycloudflare.com`.
📌 **This is the link you send to your friend.**

## 🔹 5. Temporarily change React to use tunnel backend
In `client/src/App.js`, find this line:
```javascript
newSocket = io.connect("http://localhost:3001", {
```
Change it to:
```javascript
newSocket = io.connect("https://YOUR-BACKEND.trycloudflare.com", {
```
**⚠️ Make sure:**
*   No spaces
*   No `:3001` at the end
*   Exactly the URL `cloudflared` gave you

**Then restart React** (Ctrl+C in the client terminal, then `npm start` again).

## 🔹 6. Send your friend the FRONTEND link
Send them: `https://frontend-link.trycloudflare.com`
They open it in their browser and use the app normally.

---

## 🛑 WHEN YOU ARE DONE
1.  Close both `cloudflared` terminals.
2.  Stop Node (Ctrl+C).
3.  Stop React (Ctrl+C).
4.  Change code back in `client/src/App.js` to:
    ```javascript
    newSocket = io.connect("http://localhost:3001", {
    ```
