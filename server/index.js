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
    const trimmedUsername = data.username.trim().toLowerCase();

    // Check if the room exists and if the username already exists in the room
    if (users[data.room] && users[data.room].some(user => user.username.toLowerCase() === trimmedUsername)) {
      socket.emit("join_error", { message: "Username already exists in the room." });
      return;
    }

    socket.join(data.room);
    console.log(`User with ID: ${socket.id} joined room: ${data.room}`);

    // If the room doesn't exist, initialize an empty array
    if (!users[data.room]) {
      users[data.room] = [];
    }

    // Store the user in the room
    users[data.room].push({ id: socket.id, username: data.username.trim() });

    // Notify others that a user joined
    socket.to(data.room).emit("receive_message", {
      author: "System",
      message: `${data.username.trim()} has joined the chat.`,
      time: new Date(Date.now()).getHours() + ":" + new Date(Date.now()).getMinutes(),
    });

    // Send the updated user list to all clients in the room
    io.to(data.room).emit("update_user_list", users[data.room]);

    // Send the current user list to the newly joined user
    socket.emit("update_user_list", users[data.room]);
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