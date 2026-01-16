const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const users = {}; // Stores users in each room
const rooms = {}; // Stores room metadata: { title, adminId }


const admin = require("./firebaseAdmin");
const db = admin.firestore(); // Initialize Firestore

const cleanupRoomIfEmpty = async (roomId) => {
  if (users[roomId] && users[roomId].length === 0) {
    delete rooms[roomId];
    delete users[roomId];

    // DELETE HISTORY
    try {
      const messagesRef = db.collection("messages");
      const snapshot = await messagesRef.where("room", "==", roomId).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`Room ${roomId} empty. History deleted.`);
    } catch (e) {
      console.error("Error deleting history:", e);
    }
    return true;
  }
  return false;
};

const loadRoomHistory = async (socket, roomId) => {
  try {
    const messagesRef = db.collection("messages");
    const snapshot = await messagesRef
      .where("room", "==", roomId)
      .orderBy("timestamp", "desc")
      .limit(50)
      .get();

    const history = [];
    snapshot.forEach((doc) => {
      history.push(doc.data());
    });
    // Reverse to show oldest first
    socket.emit("load_messages", history.reverse());
  } catch (error) {
    console.error("Error loading history:", error);
  }
};

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Authentication Middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken; // Attach user data to socket
    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id} (UID: ${socket.user.uid})`);

  const updateUserList = (room) => {
    io.to(room).emit("update_user_list", users[room]); // Send updated user list
  };


  socket.on("join_room", async (data) => {
    // Require that the room exists (created via create_room)
    const roomId = parseInt(data.room, 10);
    if (Number.isNaN(roomId) || roomId < 1 || roomId > 50) {
      socket.emit("join_error", { message: "Invalid room. Room must be an integer between 1 and 50." });
      return;
    }

    if (!rooms[roomId]) {
      socket.emit("join_error", { message: "Room does not exist. Please create the room first." });
      return;
    }

    // Check password
    if (data.password !== rooms[roomId].password) {
      socket.emit("join_error", { message: "Incorrect password." });
      return;
    }

    // Allow user to use the name they sent, but we trust the UID from the token
    const trimmedUsername = data.username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    // Check if username already exists in the room
    if (!users[roomId]) users[roomId] = [];
    if (users[roomId].some((user) => user.username.toLowerCase() === normalizedUsername)) {
      socket.emit("join_error", { message: "Username already exists in the room." });
      return;
    }

    if (users[roomId].length >= 25) {
      socket.emit("join_error", { message: "Room is full (max 25 participants)." });
      return;
    }

    socket.join(roomId);
    console.log(`User with ID: ${socket.id} joined room: ${roomId}`);

    // Store the user in the room (include UID)
    users[roomId].push({ id: socket.id, username: trimmedUsername, uid: socket.user.uid });

    // Notify others that a user joined
    socket.to(roomId).emit("receive_message", {
      author: "System",
      message: `${trimmedUsername} has joined the chat.`,
      time: new Date(Date.now()).toISOString(),
    });

    // Send the updated user list to all clients in the room (include isAdmin flag)
    const annotatedUsers = users[roomId].map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: rooms[roomId].adminId === u.id,
    }));
    io.to(roomId).emit("update_user_list", annotatedUsers);

    // Send the current user list to the newly joined user
    socket.emit("update_user_list", annotatedUsers);

    // --- LOAD HISTORY ---
    await loadRoomHistory(socket, roomId);
  });

  // Create room handler
  socket.on("create_room", async (data) => {
    const roomId = parseInt(data.room, 10);
    const password = (data.password || "").toString().trim();
    const trimmedUsername = (data.username || "").toString().trim();

    if (Number.isNaN(roomId) || roomId < 1 || roomId > 50) {
      socket.emit("create_error", { message: "Invalid room. Room must be an integer between 1 and 50." });
      return;
    }

    if (!password) {
      socket.emit("create_error", { message: "Password is required to create a room." });
      return;
    }

    if (rooms[roomId]) {
      socket.emit("create_error", { message: "Room already exists." });
      return;
    }

    const existingRoomCount = Object.keys(rooms).length;
    if (existingRoomCount >= 50) {
      socket.emit("create_error", { message: "Room limit reached. Cannot create new rooms right now." });
      return;
    }


    // create room and make this socket the admin
    rooms[roomId] = { password, adminId: socket.id, adminUid: socket.user.uid };
    users[roomId] = [];

    // assign a username for the creator (use provided or fallback to short id)
    const assignedUsername = trimmedUsername || `User-${socket.id.slice(-4)}`;
    users[roomId].push({ id: socket.id, username: assignedUsername, uid: socket.user.uid });
    socket.join(roomId);

    socket.emit("room_created", { room: roomId, username: assignedUsername });

    // send updated user list (creator only so far)
    const annotatedUsers = users[roomId].map((u) => ({
      id: u.id,
      username: u.username,
      isAdmin: rooms[roomId].adminId === u.id,
    }));
    io.to(roomId).emit("update_user_list", annotatedUsers);

    // --- LOAD HISTORY (Revival) ---
    // Even if created new, check if there's leftover history (though logic below deletes it on empty,
    // race conditions or manual server restart might leave it. Best to show it if it exists.)
    await loadRoomHistory(socket, roomId);
  });

  // Admin actions: remove user, make admin, end room
  socket.on("remove_user", (data) => {
    const roomId = parseInt(data.room, 10);
    const targetId = data.targetId;
    if (!rooms[roomId]) return;
    if (rooms[roomId].adminId !== socket.id) return; // only admin

    const idx = users[roomId].findIndex((u) => u.id === targetId);
    if (idx === -1) return;
    const removed = users[roomId].splice(idx, 1)[0];

    io.to(targetId).emit("kicked", { room: roomId, reason: "Removed by admin" });
    io.to(roomId).emit("receive_message", {
      author: "System",
      message: `${removed.username} was removed by the admin.`,
      time: new Date().getHours() + ":" + new Date().getMinutes(),
    });

    const annotatedUsers2 = users[roomId].map((u) => ({ id: u.id, username: u.username, isAdmin: rooms[roomId].adminId === u.id }));
    io.to(roomId).emit("update_user_list", annotatedUsers2);
  });

  socket.on("make_admin", (data) => {
    const roomId = parseInt(data.room, 10);
    const targetId = data.targetId;
    if (!rooms[roomId]) return;
    if (rooms[roomId].adminId !== socket.id) return; // only admin

    // ensure target exists
    const target = users[roomId].find((u) => u.id === targetId);
    if (!target) return;

    rooms[roomId].adminId = targetId;
    io.to(roomId).emit("receive_message", {
      author: "System",
      message: `${target.username} is now the admin.`,
      time: new Date().getHours() + ":" + new Date().getMinutes(),
    });

    const annotatedUsers3 = users[roomId].map((u) => ({ id: u.id, username: u.username, isAdmin: rooms[roomId].adminId === u.id }));
    io.to(roomId).emit("update_user_list", annotatedUsers3);
  });

  socket.on("end_room", async (data) => {
    const roomId = parseInt(data.room, 10);
    if (!rooms[roomId]) return;
    if (rooms[roomId].adminId !== socket.id) return; // only admin

    io.to(roomId).emit("room_ended", { room: roomId });
    // cleanup
    delete users[roomId];
    delete rooms[roomId];

    // --- WIPE HISTORY (Privacy) ---
    try {
      const messagesRef = db.collection("messages");
      const snapshot = await messagesRef.where("room", "==", roomId).get();
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log(`History wiped for ended room ${roomId}`);
    } catch (e) {
      console.error("Error wiping history:", e);
    }
  });




  socket.on("send_message", async (data) => {
    // Normalize room id and broadcast to the room (including any sockets regardless of sender type)
    const roomId = parseInt(data.room, 10);
    if (!Number.isNaN(roomId) && rooms[roomId]) {
      // Broadcast first for speed
      io.to(roomId).emit("receive_message", data);

      // --- SAVE TO FIRESTORE ---
      try {
        await db.collection("messages").add({
          room: roomId,
          author: data.author,
          message: data.message,
          time: data.time,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.error("Error saving message:", e);
      }
    }
  });

  socket.on("leave_room", async (data) => {
    const { room, username } = data;
    const roomIdNum = parseInt(room, 10);
    if (Number.isNaN(roomIdNum)) return;
    if (users[roomIdNum]) {
      const userIndex = users[roomIdNum].findIndex((user) => user.id === socket.id);
      if (userIndex !== -1) {
        users[roomIdNum].splice(userIndex, 1);

        // Ensure the socket leaves the room on server
        try { socket.leave(roomIdNum); } catch (e) { }

        // Notify the room that the user has left
        io.to(roomIdNum).emit("receive_message", {
          author: "System",
          message: `${username} has left the chat.`,
          time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        });

        // --- CHECK IF EMPTY & CLEANUP ---
        if (await cleanupRoomIfEmpty(roomIdNum)) return;

        // If leaving user was admin, pick a new admin or cleanup
        if (rooms[roomIdNum] && rooms[roomIdNum].adminId === socket.id) {
          if (users[roomIdNum] && users[roomIdNum].length > 0) {
            const randIndex = Math.floor(Math.random() * users[roomIdNum].length);
            const newAdmin = users[roomIdNum][randIndex];
            rooms[roomIdNum].adminId = newAdmin.id;
            io.to(roomIdNum).emit("receive_message", {
              author: "System",
              message: `${newAdmin.username} has been assigned as the new admin.`,
              time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
            });
          } else {
            // This block normally unreachable due to check above, but safe to keep
            delete users[roomIdNum];
            delete rooms[roomIdNum];
            // cleanup history here too just in case
            return;
          }
        }

        // Send updated annotated user list (with isAdmin flags)
        if (users[roomIdNum]) {
          const annotated = users[roomIdNum].map((u) => ({ id: u.id, username: u.username, isAdmin: rooms[roomIdNum] && rooms[roomIdNum].adminId === u.id }));
          io.to(roomIdNum).emit("update_user_list", annotated);
        }
      }
    }
  });


  socket.on("disconnect", async () => {
    let userRoom = null;
    let username = null;

    // Find the user's room and username
    for (const room in users) {
      const userIndex = users[room].findIndex((user) => user.id === socket.id);
      if (userIndex !== -1) {
        username = users[room][userIndex].username;
        userRoom = room;
        users[room].splice(userIndex, 1); // Remove user from array
        break;
      }
    }

    if (userRoom && username) {
      const roomIdNum = parseInt(userRoom, 10);

      // Notify the room that the user has left
      io.to(userRoom).emit("receive_message", {
        author: "System",
        message: `${username} has left the chat.`,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      });

      // --- CHECK IF EMPTY & CLEANUP ---
      if (await cleanupRoomIfEmpty(roomIdNum)) {
        console.log("User Disconnected", socket.id);
        return;
      }

      // If disconnected user was admin, pick a random new admin
      if (rooms[roomIdNum] && rooms[roomIdNum].adminId === socket.id) {
        if (users[userRoom] && users[userRoom].length > 0) {
          const randIndex = Math.floor(Math.random() * users[userRoom].length);
          const newAdmin = users[userRoom][randIndex];
          rooms[roomIdNum].adminId = newAdmin.id;
          io.to(userRoom).emit("receive_message", {
            author: "System",
            message: `${newAdmin.username} has been assigned as the new admin.`,
            time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
          });
        } else {
          // no users left; cleanup room
          delete users[userRoom];
          delete rooms[roomIdNum];
        }
      }

      // Send updated annotated user list (with isAdmin flags)
      if (users[userRoom]) {
        const annotated = users[userRoom].map((u) => ({ id: u.id, username: u.username, isAdmin: rooms[roomIdNum] && rooms[roomIdNum].adminId === u.id }));
        io.to(userRoom).emit("update_user_list", annotated);
      }
    }

    console.log("User Disconnected", socket.id);
  });

  // Handle disconnecting to propagate room changes immediately (useful for page refresh)
  socket.on("disconnecting", async () => {
    // socket.rooms is a Set of rooms the socket is currently in (includes socket.id)
    for (const roomName of socket.rooms) {
      if (roomName === socket.id) continue; // skip personal room
      const roomIdNum = parseInt(roomName, 10);
      if (Number.isNaN(roomIdNum)) continue;

      // remove user from users list for this room
      if (users[roomIdNum]) {
        const userIndex = users[roomIdNum].findIndex((u) => u.id === socket.id);
        if (userIndex !== -1) {
          const username = users[roomIdNum][userIndex].username;
          users[roomIdNum].splice(userIndex, 1);

          // Notify room
          io.to(roomIdNum).emit("receive_message", {
            author: "System",
            message: `${username} has left the chat.`,
            time: new Date().getHours() + ":" + new Date().getMinutes(),
          });

          // --- CHECK IF EMPTY & CLEANUP ---
          if (await cleanupRoomIfEmpty(roomIdNum)) continue;

          // If disconnected user was admin, reassign or cleanup
          if (rooms[roomIdNum] && rooms[roomIdNum].adminId === socket.id) {
            if (users[roomIdNum] && users[roomIdNum].length > 0) {
              const randIndex = Math.floor(Math.random() * users[roomIdNum].length);
              const newAdmin = users[roomIdNum][randIndex];
              rooms[roomIdNum].adminId = newAdmin.id;
              io.to(roomIdNum).emit("receive_message", {
                author: "System",
                message: `${newAdmin.username} has been assigned as the new admin.`,
                time: new Date().getHours() + ":" + new Date().getMinutes(),
              });
            } else {
              delete users[roomIdNum];
              delete rooms[roomIdNum];
              continue;
            }
          }

          // Emit annotated user list
          if (users[roomIdNum]) {
            const annotated = users[roomIdNum].map((u) => ({ id: u.id, username: u.username, isAdmin: rooms[roomIdNum] && rooms[roomIdNum].adminId === u.id }));
            io.to(roomIdNum).emit("update_user_list", annotated);
          }
        }
      }
    }
  });

});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});