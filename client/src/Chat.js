import React, { useState, useEffect, useRef } from "react";
import ScrollToBottom from "react-scroll-to-bottom";

function Chat({ socket, username, room }) {
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
      setMessageList((list) => [...list, messageData]);
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

    return () => {
      socket.off("receive_message");
      socket.off("update_user_list");
    };
  }, [socket]);

  return (
    <div className="chat-container">
      {/* Sidebar for Users */}
      <div className="sidebar">
        <h3>Users in Room</h3>
        <ul className="user-list">
          {userList.map((user, index) => (
            <li key={index}>{user.username}</li>
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
