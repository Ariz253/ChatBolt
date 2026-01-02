const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());

const server = http.createServer(app);

const users = {}; // Stores users in each room


const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  const updateUserList = (room) => {
    io.to(room).emit("update_users", users[room]); // Send updated user list
  };


  socket.on("join_room", (data) => {
    // Validate room id: must be integer between 1 and 500
    const roomId = parseInt(data.room, 10);
    if (Number.isNaN(roomId) || roomId < 1 || roomId > 500) {
      socket.emit("join_error", { message: "Invalid room. Room must be an integer between 1 and 500." });
      return;
    }

    const trimmedUsername = data.username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();

    // If the room doesn't exist, ensure we don't create more than 500 rooms
    const existingRoomCount = Object.keys(users).length;
    if (!users[roomId]) {
      if (existingRoomCount >= 500) {
        socket.emit("join_error", { message: "Room limit reached. Cannot create new rooms right now." });
        return;
      }
      users[roomId] = [];
    }

    // Check if username already exists in the room
    if (users[roomId].some((user) => user.username.toLowerCase() === normalizedUsername)) {
      socket.emit("join_error", { message: "Username already exists in the room." });
      return;
    }

    // Enforce max participants per room (100)
    if (users[roomId].length >= 100) {
      socket.emit("join_error", { message: "Room is full (max 100 participants)." });
      return;
    }

    socket.join(roomId);
    console.log(`User with ID: ${socket.id} joined room: ${roomId}`);

    // Store the user in the room
    users[roomId].push({ id: socket.id, username: trimmedUsername });

    // Notify others that a user joined
    socket.to(roomId).emit("receive_message", {
      author: "System",
      message: `${trimmedUsername} has joined the chat.`,
      time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
    });

    // Send the updated user list to all clients in the room
    io.to(roomId).emit("update_user_list", users[roomId]);

    // Send the current user list to the newly joined user
    socket.emit("update_user_list", users[roomId]);
  });




  socket.on("send_message", (data) => {
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("leave_room", (data) => {
    const { room, username } = data;
    if (users[room]) {
      const userIndex = users[room].findIndex((user) => user.id === socket.id);
      if (userIndex !== -1) {
        users[room].splice(userIndex, 1);

        // Notify the room that the user has left
        io.to(room).emit("receive_message", {
          author: "System",
          message: `${username} has left the chat.`,
          time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
        });

        // Send updated user list
        io.to(room).emit("update_user_list", users[room]);
      }
    }
  });


  socket.on("disconnect", () => {
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
      // Notify the room that the user has left
      io.to(userRoom).emit("receive_message", {
        author: "System",
        message: `${username} has left the chat.`,
        time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
      });
    
      // Send updated user list
      io.to(userRoom).emit("update_user_list", users[userRoom]);
    }
  
    console.log("User Disconnected", socket.id);
  });

});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});