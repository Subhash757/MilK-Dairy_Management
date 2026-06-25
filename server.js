require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const port = 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// In-memory global data store
let members = [
    { id: 'CUST-001', name: 'Ramesh Farmer', phone: '9876543210', totalMilk: 0, balance: 0 }
];
let transactions = [];

// Socket.io connection logic
io.on('connection', (socket) => {
    console.log(`[Socket] User connected: ${socket.id}`);

    // Send initial data
    socket.emit('initial_data', { members, transactions });

    socket.on('add_member', (newMember) => {
        members.push(newMember);
        io.emit('data_updated', { members, transactions });
    });

    socket.on('add_milk_entry', (transaction) => {
        transactions.push(transaction);

        const memberIndex = members.findIndex(m => m.id === transaction.memberId);
        if (memberIndex !== -1) {
            members[memberIndex].totalMilk += transaction.quantity;
            members[memberIndex].balance += transaction.amount;
        }

        io.emit('data_updated', { members, transactions });
        io.emit('new_activity', transaction);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] User disconnected: ${socket.id}`);
    });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Serve frontend files like index.html, styles.css, app.js

// Check for Twilio Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && accountSid.startsWith('AC') && authToken) {
    client = twilio(accountSid, authToken);
} else {
    console.warn("⚠️ TWILIO CREDENTIALS NOT FOUND. SMS WILL NOT BE SENT.");
    console.warn("Please add them to your .env file.");
}

// In-memory store for OTPs (For production, use Redis or a database)
const otpStore = new Map();

// Endpoint to request an OTP
app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    // Format phone number (Assuming India if it's 10 digits)
    let formattedPhone = phone;
    if (formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
    }

    try {
        // Generate a random 6-digit OTP
        const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store it with a 5-minute expiration
        otpStore.set(formattedPhone, {
            otp: generatedOTP,
            expiresAt: Date.now() + 5 * 60 * 1000
        });

        console.log(`[DEV] Generated OTP for ${formattedPhone}: ${generatedOTP}`);

        // Try to send the SMS
        if (client && twilioPhoneNumber && twilioPhoneNumber !== 'your_twilio_phone_number_here') {
            try {
                await client.messages.create({
                    body: `Your Nandini Dairy login OTP is: ${generatedOTP}. Do not share this with anyone.`,
                    from: twilioPhoneNumber,
                    to: formattedPhone
                });
                console.log(`SMS successfully sent to ${formattedPhone}`);
            } catch (smsError) {
                console.error('Failed to send actual SMS (Check Twilio credentials). Continuing anyway for local testing.', smsError.message);
            }
        } else {
            console.log("Skipping actual SMS send. Twilio not configured properly.");
        }

        res.json({ success: true, message: 'OTP generated.', mockOtp: generatedOTP });
    } catch (error) {
        console.error('Twilio Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP via SMS.', error: error.message });
    }
});

// Endpoint to verify the OTP
app.post('/api/verify-otp', (req, res) => {
    const { phone, otp } = req.body;

    let formattedPhone = phone;
    if (formattedPhone && formattedPhone.length === 10) {
        formattedPhone = '+91' + formattedPhone;
    }

    const record = otpStore.get(formattedPhone);

    if (!record) {
        return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    if (Date.now() > record.expiresAt) {
        otpStore.delete(formattedPhone); // Clean up expired OTP
        return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    // Also allow "123456" as a universal bypass for local testing
    if (record.otp === otp || otp === '123456') {
        // Valid OTP
        otpStore.delete(formattedPhone); // Remove after success
        res.json({ success: true, message: 'OTP verified successfully.' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }
});

server.listen(port, () => {
    console.log(`=========================================`);
    console.log(` Backend server running at http://localhost:${port} `);
    console.log(`=========================================`);
});
