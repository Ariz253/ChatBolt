import React, { useState, useEffect, useRef } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room, onLeave }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [userList, setUserList] = useState([]); // Store connected users

  const sendMessage = async () => {
    if (currentMessage !== "") {
      const messageData = {
        room: room,
        author: username,
        message: currentMessage,
        time: new Date().toISOString(),
      };
      await socket.emit("send_message", messageData);
      setCurrentMessage("");
    }
  };

  const leaveRoom = () => {
    socket.emit("leave_room", { room, username });
    if (onLeave) onLeave();
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    // Listen for prior messages (history)
    socket.on("load_messages", (messages) => {
      setMessageList(messages);
    });

    // Listen for user list updates
    socket.on("update_user_list", (users) => {
      setUserList(users);
    });

    socket.on("kicked", (data) => {
      if (String(data.room) === String(room)) {
        alert("You were removed from the room by the admin.");
        if (onLeave) onLeave();
      }
    });

    socket.on("room_ended", (data) => {
      if (String(data.room) === String(room)) {
        alert("Room has been ended by the admin.");
        if (onLeave) onLeave();
      }
    });

    return () => {
      socket.off("receive_message");
      socket.off("load_messages");
      socket.off("update_user_list");
      socket.off("kicked");
      socket.off("room_ended");
    };
  }, [socket, room, onLeave]); // Added dependencies

  // Auto-scroll to bottom when a new message is added
  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messageList]);

  return (
    <div className="chat-container">
      {/* Room Controls (Top Right) */}
      <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', zIndex: 100 }}>
        <button className="logout-button" onClick={leaveRoom} style={{ position: 'static' }}>Leave Room</button>
        {userList.some(u => u.id === socket.id && u.isAdmin) && (
          <button className="end-room-button" onClick={() => {
            if (window.confirm('End room for everyone?')) {
              socket.emit('end_room', { room });
            }
          }} style={{ position: 'static', transform: 'none' }}>End Room</button>
        )}
      </div>

      {/* Sidebar for Users */}
      <div className="sidebar">
        <h3>Users in Room</h3>
        <ul className="user-list">
          {userList.map((user, index) => (
            <li key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{user.username}{user.isAdmin ? ' (admin)' : ''}</span>
              {/* show admin controls if current user is admin and this is not the current user */}
              {userList.some(u => u.id === socket.id && u.isAdmin) && user.id !== socket.id && (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => socket.emit('remove_user', { room, targetId: user.id })}>Remove</button>
                  <button onClick={() => socket.emit('make_admin', { room, targetId: user.id })}>Make Admin</button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Window */}
      <div className="chat-window">
        <div className="chat-header">
          <p>Live Chat</p>
        </div>
        <div className="chat-body">
          <ScrollToBottom className="message-container">
            {messageList.map((messageContent, index) => {
              const isSystemMessage = messageContent.author === "System"; // Check if it's a system message

              // Handle Time Formatting
              let displayTime = messageContent.time;
              if (messageContent.time && messageContent.time.includes("T")) {
                try {
                  displayTime = new Date(messageContent.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) { }
              }

              return (
                <div
                  className={`message ${isSystemMessage ? "system-message" : ""}`}
                  id={!isSystemMessage ? (username === messageContent.author ? "you" : "other") : ""}
                  key={index}
                >
                  <div>
                    <div className="message-content">
                      <p style={{ whiteSpace: "pre-line" }}>{messageContent.message}</p>
                    </div>
                    <div className="message-meta">
                      <p id="time">{displayTime}</p>
                      {!isSystemMessage && <p id="author">{messageContent.author}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* dummy element to scroll into view */}
            <div ref={messagesEndRef} />
          </ScrollToBottom>
        </div>
        <div className="chat-footer">
          <textarea
            value={currentMessage}
            placeholder="Hey..."
            rows={2}
            onChange={(e) => setCurrentMessage(e.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
              // Shift+Enter will insert a new line by default
            }}
          />
          <button onClick={sendMessage}>&#9658;</button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
