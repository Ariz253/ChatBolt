import './App.css';
import io from "socket.io-client";
import { useState, useEffect } from "react";
import Chat from './Chat';
import Auth from './Auth';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';


function App() {
  const [user, setUser] = useState(null); // Firebase User
  // Token is local to effect

  // Socket state
  const [socket, setSocket] = useState(null);

  // App state
  const [username, setUsername] = useState("");
  const [joinUsername, setJoinUsername] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [room, setRoom] = useState("");
  const [showChat, setShowChat] = useState(false);
  const [createRoomId, setCreateRoomId] = useState("");
  const [createTitle, setCreateTitle] = useState("");

  // Listen for Auth Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUsername("");
        setJoinUsername("");
        setCreateUsername("");
      } else {
        setUsername(currentUser.displayName || "User");
        setJoinUsername(currentUser.displayName || "");
        setCreateUsername(currentUser.displayName || "");
      }
    });
    return () => unsubscribe();
  }, []);

  // Manage Socket Connection based on User
  useEffect(() => {
    if (user) {
      let newSocket;
      user.getIdToken().then((token) => {
        newSocket = io.connect("http://localhost:3001", {
          auth: { token }
        });
        setSocket(newSocket);
      });

      return () => {
        if (newSocket) newSocket.disconnect();
        setSocket(null);
        setShowChat(false);
      };
    }
  }, [user]);

  // Socket Event Listeners
  useEffect(() => {
    if (!socket) return;

    const handleJoinError = (data) => alert(data.message);
    const handleCreateError = (data) => alert(data.message);
    const handleRoomCreated = (data) => {
      setRoom(String(data.room));
      // Use the name from the server if provided, otherwise trust auth
      if (data.username) setUsername(data.username);
      setShowChat(true);
    };

    socket.on("join_error", handleJoinError);
    socket.on("create_error", handleCreateError);
    socket.on("room_created", handleRoomCreated);

    return () => {
      socket.off("join_error", handleJoinError);
      socket.off("create_error", handleCreateError);
      socket.off("room_created", handleRoomCreated);
    };
  }, [socket]); // Re-run when socket changes

  const joinRoom = () => {
    if (!joinUsername) { alert("Please enter a username."); return; }
    if (room.trim() === "") { alert("Please enter a room number."); return; }
    if (!/^\d+$/.test(room.trim())) { alert("Room code must be a number."); return; }

    const roomNum = parseInt(room.trim(), 10);
    if (isNaN(roomNum) || roomNum < 1 || roomNum > 50) {
      alert("Room number must be between 1 and 50.");
      return;
    }

    socket.emit("join_room", { room: room.trim(), username: joinUsername }); // Use editable username

    socket.once("update_user_list", () => {
      setShowChat(true);
    });
  }

  const createRoom = () => {
    if (!createUsername) { alert("Please enter a username."); return; }
    if (!/^\d+$/.test(createRoomId.trim())) { alert("Room id must be a number."); return; }

    const roomNum = parseInt(createRoomId.trim(), 10);
    if (isNaN(roomNum) || roomNum < 1 || roomNum > 50) {
      alert("Room number must be between 1 and 50.");
      return;
    }

    socket.emit("create_room", { room: roomNum, title: createTitle, username: createUsername });
  };

  const leaveRoom = () => {
    socket.emit("leave_room", { room, username });
    setShowChat(false);
    setRoom("");
    // We don't clear username/user because they are still logged in
  }

  const handleLogout = () => {
    signOut(auth);
  };


  if (!user) {
    return <Auth />;
  }

  return (
    <div className="App">
      <button onClick={handleLogout} className="logout-button" style={{ position: 'absolute', top: 10, right: 10 }}>Sign Out</button>

      {!showChat ? (
        <div className="landing-card">
          <div className="landing-left">
            <h3 className="panel-title">Join Room</h3>
            <input type="text" placeholder="Username" value={joinUsername} onChange={(e) => { setJoinUsername(e.target.value); }} />
            <input type="text" placeholder="Room (1-50)" value={room} onChange={(e) => { setRoom(e.target.value); }} />
            <button className="primary" onClick={joinRoom}>Join a Room</button>
          </div>

          <div className="landing-center">
            <h1 className="brand-title">ChatBolt</h1>
          </div>

          <div className="landing-right">
            <h3 className="panel-title">Create Room</h3>
            <input type="text" placeholder="Username" value={createUsername} onChange={(e) => { setCreateUsername(e.target.value); }} />
            <input type="text" placeholder="Room ID (1-50)" value={createRoomId} onChange={(e) => setCreateRoomId(e.target.value)} />
            <input type="text" placeholder="Title (optional)" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} />
            <button className="primary" onClick={createRoom}>Create Room</button>
          </div>
        </div>
      ) : (
        <div>
          <button onClick={leaveRoom} className="logout-button">Leave Room</button>
          <Chat socket={socket} username={username} room={room} onLeave={() => { setShowChat(false); setRoom(''); }} />
        </div>
      )}
    </div>
  );
}

export default App;
