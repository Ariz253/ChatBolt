import CryptoJS from 'crypto-js';

export const encryptMessage = (message, secretKey) => {
    if (!message || !secretKey) return message;
    try {
        return CryptoJS.AES.encrypt(message, secretKey).toString();
    } catch (e) {
        console.error("Encryption error:", e);
        return message;
    }
};

export const decryptMessage = (encryptedMessage, secretKey) => {
    if (!encryptedMessage || !secretKey) return encryptedMessage;
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedMessage, secretKey);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        // If decryption yields empty string, it likely failed or wrong key
        return originalText || encryptedMessage;
    } catch (e) {
        // console.error("Decryption error (possibly wrong key or old message):", e);
        return encryptedMessage; // Return original if decryption fails (fallback)
    }
};
