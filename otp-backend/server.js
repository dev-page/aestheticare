// server.js
import express from 'express'
import cors from 'cors'
import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'

// import fetch from 'node-fetch'
import { initializeApp } from 'firebase/app'
import { getFirestore, setDoc, doc } from 'firebase/firestore'

// Load environment variables from .env
// Load environment variables from .env
dotenv.config()

// Debug logs to confirm environment variables
console.log("API Key loaded:", !!process.env.SENDGRID_API_KEY)
console.log("Sender:", process.env.SENDGRID_SENDER)

const app = express()
app.use(cors())
app.use(express.json())

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY)
// ------------------- Existing OTP Endpoint -------------------
app.post("/send-otp", async (req, res) => {
  const { recipient, otp } = req.body;

  const msg = {
    to: recipient,
    from: process.env.SENDGRID_SENDER,
    subject: "Your OTP Code",
    text: `Your one-time password is: ${otp}`,
    html: `<strong>Your OTP code is: ${otp}</strong>`,
  };

  try {
    await sgMail.send(msg);
    res.json({ success: true });
  } catch (error) {
    // 🔹 Improved error logging
    console.error("SendGrid error:", error.response?.body || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.body || error.message
    });
  }
});

const firebaseConfig = {  
  apiKey: "AIzaSyB3u8YsBjlfXxAk9eZunZOS3g9ZqnNbpl0",
  authDomain: "aesthetic-db.firebaseapp.com",
  projectId: "aesthetic-db",
  storageBucket: "aesthetic-db.firebasestorage.app",
  messagingSenderId: "112088599784",
  appId: "1:112088599784:web:96324b52401b87ea36cd5d",
  measurementId: "G-H1P2JNWDDJ"
};
initializeApp(firebaseConfig);
const db = getFirestore();

// ------------------- 🔥 Added Zoom Meeting Endpoint -------------------
/*
app.post("/api/create-meeting", async (req, res) => {
  const { patientName, consultationTime } = req.body;

  try {
    // Call Zoom API to create meeting
    const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ZOOM_JWT_TOKEN}`, // 🔥 Added Zoom JWT token
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topic: `Consultation with ${patientName}`,
        type: 2, // scheduled meeting
        start_time: consultationTime,
        duration: 30,
      }),
    });

    const meeting = await response.json();

    // Save meeting details to Firestore
    await setDoc(doc(db, "consultations", meeting.id.toString()), {
      patientName,
      consultationTime,
      meetingId: meeting.id,
      join_url: meeting.join_url,
    });

    res.json({ meeting });
  } catch (err) {
    console.error("Error creating Zoom meeting:", err);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});
*/
// ------------------- Server Startup -------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));