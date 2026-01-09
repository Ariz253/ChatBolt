# ChatBolt

ChatBolt is a real-time chat room application built with React (client) and Node.js/Express/Socket.io (server). Users can join chat rooms, send messages, and see who else is online in the room.

## Features

- Real-time messaging with Socket.io
- Join chat rooms with a username and room code
- See a live list of users in each room
- System messages for user join/leave events
- Responsive and modern UI

## Tech Stack

- **Frontend:** React, react-scroll-to-bottom, socket.io-client
- **Backend:** Node.js, Express, Socket.io, CORS

## Getting Started

### Prerequisites

- Node.js and npm installed

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Ariz253/ChatBolt.git
   cd ChatBolt
   ```

2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Running the App

1. **Start the server:**
   ```bash
   cd ../server
   npm start
   ```
   The server will run on [http://localhost:3001](http://localhost:3001).

2. **Start the client:**
   ```bash
   cd ../client
   npm start
   ```
   The client will run on [http://localhost:3000](http://localhost:3000).

3. **Open your browser and go to [http://localhost:3000](http://localhost:3000) to use the chat app.**

### Usage

- Enter a username and a numeric room code to join a chat room.
- Chat in real time with others in the same room.
- See the list of users currently in the room.
- Click "Logout" to leave the room.

## Project Structure

```
ChatBolt/
  client/      # React frontend
  server/      # Node.js backend
  .gitignore
  README.md
  chatlogo.png
```

## License

This project is licensed under the ISC License.

## Code Documentation

[text](https://deepwiki.com/Ariz253/ChatBolt)

---

*Made with ❤️ by Ariz Ejaz Khan*