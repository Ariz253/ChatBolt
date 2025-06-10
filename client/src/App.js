import './App.css';
import io from "socket.io-client";
import { useState, useEffect } from "react";
import Chat from './Chat';


const socket = io.connect("http://localhost:3001");

function App() {

  const [username, setUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    // Register the join_error listener once
    const handleJoinError = (data) => {
      alert(data.message); // Display error message to the user
    };

    socket.on("join_error", handleJoinError);

    // Cleanup the listener on component unmount
    return () => {
      socket.off("join_error", handleJoinError);
    };
  }, []);

  const joinRoom = () => {
    if (username.trim() !== "" && room.trim() !== "") {
      // Validate that the room code is numeric
      if (!/^\d+$/.test(room.trim())) {
        alert("Room code must be a number.");
        return;
      }

      socket.emit("join_room", { room: room.trim(), username: username.trim() });

      socket.on("update_user_list", () => {
        setShowChat(true); // Proceed only if no error
      });
    }
  }

  const leaveRoom = () => {
    socket.emit("leave_room", { room, username });
    setShowChat(false);
    setRoom("");
    setUsername("");
  }


  return (
    <div className="App">
      {!showChat ?( 
      <div className="joinChatContainer">
      <h3>ChatBolt</h3>
      <input type="text" placeholder="Username" value={username} onChange={(e) => {setUsername(e.target.value);}} />
      <input type="text" placeholder="Room" value={room} onChange={(e) => {setRoom(e.target.value);}} />
      <button onClick={joinRoom}>Join a Room</button>
      </div>
      )
      : (
      <div>
        <button onClick={leaveRoom} className="logout-button">Logout</button>
        <Chat socket={socket} username={username} room={room} />
      </div>
    )}
    </div>
  );
}

export default App;
