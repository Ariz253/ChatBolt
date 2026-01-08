const admin = require("firebase-admin");

// TODO: Replace with the path to your service account key file
// Dowload from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key
// Save the file as 'serviceAccountKey.json' in this directory.
try {
    const serviceAccount = require("./serviceAccountKey.json");

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log("Firebase Admin Initialized");
} catch (error) {
    console.error("Error initializing Firebase Admin:", error.message);
    console.error("Make sure you have downloaded 'serviceAccountKey.json' and placed it in the server directory.");
}

module.exports = admin;
