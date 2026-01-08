import React, { useState } from "react";
import { auth } from "./firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile,
} from "firebase/auth";

function Auth({ onLogin }) {
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            if (isRegistering) {
                if (!username.trim()) {
                    setError("Username is required for registration.");
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: username });
                // onLogin will be handled by the auth state listener in App.js
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(err.message.replace("Firebase: ", ""));
        }
    };

    return (
        <div className="landing-card">
            <div className="landing-center">
                <h1 className="brand-title">ChatBolt</h1>
            </div>
            <div className="auth-container" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <h3 className="panel-title">{isRegistering ? "Register" : "Login"}</h3>

                {error && <p style={{ color: "red", fontSize: "0.9em" }}>{error}</p>}

                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {isRegistering && (
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="primary">
                        {isRegistering ? "Sign Up" : "Log In"}
                    </button>
                </form>

                <p style={{ marginTop: "10px", fontSize: "0.9em", color: "#ccc" }}>
                    {isRegistering ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        className="link-button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{ background: "none", border: "none", color: "#43aeff", cursor: "pointer", textDecoration: "underline" }}
                    >
                        {isRegistering ? "Log In" : "Register"}
                    </button>
                </p>
            </div>
        </div>
    );
}

export default Auth;
