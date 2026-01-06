import './App.css';
import io from "socket.io-client";
import { useState, useEffect } from "react";
import Chat from './Chat';


const socket = io.connect("http://localhost:3001");

function App() {

  const [username, setUsername] = useState(""); // legacy/current chat username
  const [joinUsername, setJoinUsername] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [createRoomId, setCreateRoomId] = useState("");
  const [createTitle, setCreateTitle] = useState("");

  useEffect(() => {
    // Register the join_error listener once
    const handleJoinError = (data) => {
      alert(data.message); // Display error message to the user
    };

    socket.on("join_error", handleJoinError);

    const handleCreateError = (data) => {
      alert(data.message);
    };
    const handleRoomCreated = (data) => {
      // Use server-provided username if available (authoritative), else fall back to createUsername
      setRoom(String(data.room));
      setUsername((data && data.username) ? data.username : (createUsername || ""));
      setShowChat(true);
    };

    socket.on("create_error", handleCreateError);
    socket.on("room_created", handleRoomCreated);

    // Cleanup the listener on component unmount
    return () => {
      socket.off("join_error", handleJoinError);
  socket.off("create_error", handleCreateError);
  socket.off("room_created", handleRoomCreated);
    };
  }, [createUsername]);

  const joinRoom = () => {
    const trimmedJoin = joinUsername.trim();
    if (trimmedJoin === "") {
      alert("Please enter a username before joining a room.");
      return;
    }

    if (room.trim() === "") {
      alert("Please enter a room number.");
      return;
    }

    // Validate that the room code is numeric
    if (!/^\d+$/.test(room.trim())) {
      alert("Room code must be a number.");
      return;
    }

    const roomNum = parseInt(room.trim(), 10);
    if (isNaN(roomNum) || roomNum < 1 || roomNum > 50) {
      alert("Room number must be between 1 and 50.");
      return;
    }

    socket.emit("join_room", { room: room.trim(), username: trimmedJoin });

    socket.once("update_user_list", () => {
      setUsername(trimmedJoin);
      setShowChat(true); // Proceed only if no error
    });
  }

  const createRoom = () => {
    const trimmedCreate = createUsername.trim();
    if (trimmedCreate === "") {
      alert("Please enter a username before creating a room.");
      return;
    }

    if (!/^\d+$/.test(createRoomId.trim())) {
      alert("Room id must be a number.");
      return;
    }
    const roomNum = parseInt(createRoomId.trim(), 10);
    if (isNaN(roomNum) || roomNum < 1 || roomNum > 50) {
      alert("Room number must be between 1 and 50.");
      return;
    }

    socket.emit("create_room", { room: roomNum, title: createTitle, username: trimmedCreate });
  };

  const leaveRoom = () => {
  socket.emit("leave_room", { room, username });
  setShowChat(false);
  setRoom("");
  setUsername("");
  setJoinUsername("");
  setCreateUsername("");
  }


  return (
    <div className="App">
      {!showChat ? (
        <div className="landing-card">
          <div className="landing-left">
              <h3 className="panel-title">Join Room</h3>
              <input type="text" placeholder="Username" value={joinUsername} onChange={(e) => {setJoinUsername(e.target.value);}} />
              <input type="text" placeholder="Room (1-50)" value={room} onChange={(e) => {setRoom(e.target.value);}} />
              <button className="primary" onClick={joinRoom}>Join a Room</button>
            </div>

          <div className="landing-center">
            <h1 className="brand-title">ChatBolt</h1>
          </div>

          <div className="landing-right">
            <h3 className="panel-title">Create Room</h3>
            <input type="text" placeholder="Username" value={createUsername} onChange={(e) => {setCreateUsername(e.target.value);}} />
        <input type="text" placeholder="Room ID (1-50)" value={createRoomId} onChange={(e) => setCreateRoomId(e.target.value)} />
            <input type="text" placeholder="Title (optional)" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
            <button className="primary" onClick={createRoom}>Create Room</button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={leaveRoom} className="logout-button">Logout</button>
          <Chat socket={socket} username={username} room={room} onLeave={() => { setShowChat(false); setRoom(''); setUsername(''); }} />
        </div>
      )}
    </div>
  );
}

export default App;
