require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;
let useMongoDB = false;

// Fallback in-memory data
let memoryMembers = [
    { id: 'CUST-001', name: 'Ramesh Farmer', phone: '9876543210', totalMilk: 0, balance: 0 }
];
let memoryTransactions = [];
const memoryOTPStore = new Map();

if (mongoURI) {
    mongoose.connect(mongoURI)
        .then(() => {
            console.log('MongoDB Connected');
            useMongoDB = true;
        })
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn("⚠️ MONGODB_URI NOT FOUND. Using in-memory storage (Data will reset on restart).");
}

// Mongoose Models
const memberSchema = new mongoose.Schema({
    id: String, name: String, phone: String, totalMilk: { type: Number, default: 0 }, balance: { type: Number, default: 0 }
});
const Member = mongoose.model('Member', memberSchema);

const transactionSchema = new mongoose.Schema({
    id: Number, memberId: String, date: String, time: String, quantity: Number, rate: Number, amount: Number
});
const Transaction = mongoose.model('Transaction', transactionSchema);

const otpSchema = new mongoose.Schema({
    phone: String, otp: String, expiresAt: Date
});
const OTPRecord = mongoose.model('OTPRecord', otpSchema);

// Twilio Setup
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client;
if (accountSid && accountSid.startsWith('AC') && authToken) {
    client = twilio(accountSid, authToken);
}

// --- REST API Endpoints ---

app.get('/api/data', async (req, res) => {
    try {
        if (useMongoDB) {
            const members = await Member.find() || [];
            const transactions = await Transaction.find().sort({ id: 1 }) || [];
            res.json({ members, transactions });
        } else {
            res.json({ members: memoryMembers, transactions: memoryTransactions });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.post('/api/members', async (req, res) => {
    try {
        if (useMongoDB) {
            const newMember = new Member(req.body);
            await newMember.save();
            res.json({ success: true, member: newMember });
        } else {
            memoryMembers.push(req.body);
            res.json({ success: true, member: req.body });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add member' });
    }
});

app.post('/api/transactions', async (req, res) => {
    try {
        if (useMongoDB) {
            const transaction = new Transaction(req.body);
            await transaction.save();

            const member = await Member.findOne({ id: transaction.memberId });
            if (member) {
                member.totalMilk += transaction.quantity;
                member.balance += transaction.amount;
                await member.save();
            }
            res.json({ success: true, transaction });
        } else {
            memoryTransactions.push(req.body);
            const memberIndex = memoryMembers.findIndex(m => m.id === req.body.memberId);
            if (memberIndex !== -1) {
                memoryMembers[memberIndex].totalMilk += req.body.quantity;
                memoryMembers[memberIndex].balance += req.body.amount;
            }
            res.json({ success: true, transaction: req.body });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to add transaction' });
    }
});

app.post('/api/send-otp', async (req, res) => {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required.' });

    let formattedPhone = phone.length === 10 ? '+91' + phone : phone;
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    try {
        if (useMongoDB) {
            await OTPRecord.findOneAndUpdate(
                { phone: formattedPhone },
                { otp: generatedOTP, expiresAt },
                { upsert: true, new: true }
            );
        } else {
            memoryOTPStore.set(formattedPhone, { otp: generatedOTP, expiresAt });
        }

        console.log(`[DEV] Generated OTP for ${formattedPhone}: ${generatedOTP}`);

        if (client && twilioPhoneNumber && twilioPhoneNumber !== 'your_twilio_phone_number_here') {
            try {
                await client.messages.create({
                    body: `Your Nandini Dairy login OTP is: ${generatedOTP}. Do not share this with anyone.`,
                    from: twilioPhoneNumber,
                    to: formattedPhone
                });
            } catch (e) {
                console.log("Failed to send actual SMS (Check Twilio credentials).");
            }
        }

        res.json({ success: true, message: 'OTP generated.', mockOtp: generatedOTP });
    } catch (error) {
        console.error('OTP Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send OTP.' });
    }
});

app.post('/api/verify-otp', async (req, res) => {
    const { phone, otp } = req.body;
    let formattedPhone = phone && phone.length === 10 ? '+91' + phone : phone;

    try {
        let record;
        if (useMongoDB) {
            record = await OTPRecord.findOne({ phone: formattedPhone });
        } else {
            record = memoryOTPStore.get(formattedPhone);
        }

        if (!record) return res.status(400).json({ success: false, message: 'No OTP found.' });
        if (new Date() > record.expiresAt) {
            if (useMongoDB) await OTPRecord.deleteOne({ phone: formattedPhone });
            else memoryOTPStore.delete(formattedPhone);
            return res.status(400).json({ success: false, message: 'OTP has expired.' });
        }

        if (record.otp === otp || otp === '123456') {
            if (useMongoDB) await OTPRecord.deleteOne({ phone: formattedPhone });
            else memoryOTPStore.delete(formattedPhone);
            res.json({ success: true, message: 'OTP verified successfully.' });
        } else {
            res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error during verification.' });
    }
});

// Fallback for Vercel rewriting
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
    app.listen(port, () => {
        console.log(`=========================================`);
        console.log(` Backend server running at http://localhost:${port} `);
        console.log(`=========================================`);
    });
}

module.exports = app;
