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
        time: new Date().getHours() + ":" + new Date().getMinutes(),
      };
      await socket.emit("send_message", messageData);
      setCurrentMessage("");
    }
  };

  useEffect(() => {
    socket.on("receive_message", (data) => {
      setMessageList((list) => [...list, data]);
    });

    // Listen for user list updates
    socket.on("update_user_list", (users) => {
      setUserList(users);
    });

    socket.on("kicked", (data) => {
      if (data.room === room) { // Strict equality
        alert("You were removed from the room by the admin.");
        if (onLeave) onLeave();
      }
    });

    socket.on("room_ended", (data) => {
      if (data.room === room) { // Strict equality
        alert("Room has been ended by the admin.");
        if (onLeave) onLeave();
      }
    });

    return () => {
      socket.off("receive_message");
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
          {/* End Room button visible to admin */}
          {userList.some(u => u.id === socket.id && u.isAdmin) && (
            <button className="end-room-button" onClick={() => {
              if (window.confirm('End room for everyone?')) {
                socket.emit('end_room', { room });
              }
            }}>End Room</button>
          )}
        </div>
        <div className="chat-body">
          <ScrollToBottom className="message-container">
            {messageList.map((messageContent, index) => {
              const isSystemMessage = messageContent.author === "System"; // Check if it's a system message
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
                      <p id="time">{messageContent.time}</p>
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
