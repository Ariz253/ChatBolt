export const uploadToCloudinary = async (file) => {
    if (!file) return null;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "chatbolt"); // Your Unsigned preset

    try {
        const response = await fetch(
            "https://api.cloudinary.com/v1_1/dbls8kyia/image/upload",
            {
                method: "POST",
                body: formData,
            }
        );

        if (!response.ok) {
            throw new Error("Upload failed");
        }

        const data = await response.json();
        return data.secure_url;
    } catch (error) {
        console.error("Error uploading image:", error);
        throw error;
    }
};
