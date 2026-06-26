<div align="center">


# 🥛 Milk-Dairy Management System

<a href="https://github.com/Subhash757/Milk-Dairy_Management/stargazers"><img src="https://img.shields.io/github/stars/Subhash757/Milk-Dairy_Management?style=for-the-badge&color=8C5C38" alt="Stars"></a>
<a href="https://github.com/Subhash757/Milk-Dairy_Management/issues"><img src="https://img.shields.io/github/issues/Subhash757/Milk-Dairy_Management?style=for-the-badge&color=4F46E5" alt="Issues"></a>
<img src="https://img.shields.io/badge/status-active-22C55E?style=for-the-badge" alt="Status">

<br/><br/>

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)
![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=flat-square&logo=twilio&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chart.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)

**A real-time web app for running a milk collection center.**  
*Daily milk entries, OTP-based member login, and live admin dashboards. Built for dairy owners, farmers, and small collection centers moving off paper records.*

</div>

---

## 📋 Table of Contents
- [Highlights](#-highlights)
- [Features](#-features)
- [Real-Time Architecture](#-real-time-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Demo Access](#-demo-access)
- [Screenshots](#-screenshots)
- [Known Limitations & Roadmap](#-known-limitations--roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

---

## ⭐ Highlights

- ⚡ **Live dairy dashboard** powered by **Socket.io** — no manual refresh, ever.
- 💰 **Daily milk collection** and transaction tracking with auto-calculated payouts.
- 🔒 **Admin access** with passcode protection.
- 📱 **Member login** via phone number + OTP (real SMS through Twilio, or console fallback for local testing).
- 🌓 **Light/dark theme**, fully responsive, and **₹** (INR) formatted throughout.
- 🚀 **Clean Node.js + Express backend**, vanilla JS frontend — no framework overhead.
- 📁 **Beginner-friendly file structure**, incredibly easy to scale and extend.

---

## ✨ Features

### 🔐 Authentication
- **Phone + OTP login** for farmers/members (via **Twilio SMS**).
- Self-service registration for new members.
- Separate passcode-protected **Admin** login.
- **Dev-friendly fallback:** OTP is logged to the console and a universal test code is accepted when Twilio isn't configured.

### 🧑‍💼 Admin Dashboard
- **Live stats:** Total members, today's milk collected, and today's payout.
- Add new members on the fly.
- Daily milk entry with **auto-calculated amount** (quantity × configurable rate).
- Searchable member directory with balance & milk totals.
- **7-day collection trend chart** + top farmers breakdown (powered by Chart.js).
- Live activity feed with **toast notifications** on every new entry.
- Document upload UI for member paperwork.

### 🌾 Farmer / Member Portal
- Personal dashboard with current balance and total milk supplied.
- Full transaction history table for absolute transparency.

### 🎨 UI/UX
- **Light/dark theme toggle** (persisted across sessions, charts re-theme automatically).
- Responsive, card-based layout with animated background shapes.

---

## ⚡ Real-Time Architecture

Every admin and member action is broadcast live via **Socket.io** — this is already wired up end-to-end, not a future add-on:

```text
Member / Admin action (e.g., new milk entry submitted)
        │
        ▼
Socket.io receives the event on the server
        │
        ▼
In-memory store (members & transactions) is updated
        │
        ▼
io.emit() broadcasts the change to every connected client
        │
        ▼
Admin dashboard & member portal update instantly + toast notification fires
```

**Live events currently implemented:**
| Event | Trigger |
|---|---|
| `initial_data` | Sent to a client the moment it connects |
| `add_member` / `add_milk_entry` | Emitted by a client performing an action |
| `data_updated` | Broadcast to all clients after the store changes |
| `new_activity` | Broadcast to trigger the toast notification feed |

A `localStorage` cache keeps the UI responsive between syncs and acts as a cross-tab fallback.

---

## 🛠 Tech Stack

| Layer        | Technology                          |
|--------------|--------------------------------------|
| **Backend**  | Node.js, Express 5                   |
| **Real-time**| Socket.io (implemented)              |
| **SMS/OTP**  | Twilio                               |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript      |
| **Charts**   | Chart.js                             |
| **Design**   | Font Awesome 6, Google Fonts (Inter) |
| **Config**   | dotenv, cors                         |

---

## 📁 Project Structure

```text
Milk-Dairy_Management/
├── .vscode/
├── .gitignore
├── server.js          # Express server, Socket.io, Twilio OTP endpoints
├── app.js             # Frontend logic (auth, dashboards, charts, sockets)
├── index.html         # Single-page UI (login, admin & customer sections)
├── styles.css         # Theming (light/dark) and layout
├── .env.example       # Template for required environment variables
├── package.json
├── package-lock.json
└── .env               # Twilio credentials (not committed)
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A [Twilio](https://www.twilio.com/) account (optional — only needed for real SMS)

### Installation

```bash
# Clone the repo
git clone https://github.com/Subhash757/Milk-Dairy_Management.git
cd Milk-Dairy_Management

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env   # then fill in your Twilio credentials

# Run the server
node server.js
```

The app will be live at **http://localhost:3000** 🎉

---

## 🔑 Environment Variables

Create a `.env` file in the root directory (or copy `.env.example`):

```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

> **Note:** Without valid Twilio credentials, the server still runs perfectly! OTPs are simply printed to your terminal console instead of being sent via SMS.

---

## 🧪 Demo Access

| Role   | Credential                                   |
|--------|-----------------------------------------------|
| **Admin**  | Passcode: `admin123`                          |
| **Member** | Any registered phone → OTP `123456` (bypass)  |

> ⚠️ These are hardcoded for local testing. **Change the admin passcode and remove the OTP bypass before deploying publicly.**

---

## 📸 Screenshots

*(Pro-tip: Take some beautiful screenshots of your app running locally and drop them here! Replace the links below with your actual image paths once you have them).*

```md
![Admin Dashboard](https://via.placeholder.com/1000x500.png?text=Admin+Dashboard+Screenshot+Goes+Here)
![Member Portal](https://via.placeholder.com/1000x500.png?text=Member+Portal+Screenshot+Goes+Here)
```

---

## 🧭 Known Limitations & Roadmap

- [ ] Data is currently stored **in-memory** — it resets on every server restart. Next step: persist members/transactions to a database (MongoDB/PostgreSQL).
- [ ] Document upload is UI-only (mocked) — needs backend storage.
- [ ] Admin auth is a single shared passcode — move to individual secure admin accounts.
- [ ] Add PDF receipt generation for milk entries.
- [ ] Add CSV export for collection reports.
- [ ] Add payment status tracking (paid / pending / overdue).
- [ ] Add daily, weekly, and monthly dairy analytics.
- [ ] Add SMS alerts for payments and milk collection updates.

---

## 🤝 Contributing

Contributions, issues, and feature requests are highly welcome!
1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is currently unlicensed. All rights reserved. *(Consider adding an [MIT License](https://choosealicense.com/licenses/mit/) if you'd like others to freely use or contribute to this project!)*

---

## 📬 Contact

<div align="center">

**Subhash K M**

[![GitHub](https://img.shields.io/badge/GitHub-Subhash757-181717?style=for-the-badge&logo=github)](https://github.com/Subhash757)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/subhash-k-m-86527537a)
[![Instagram](https://img.shields.io/badge/Instagram-Follow-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://instagram.com/___subhash_____18)
[![Email](https://img.shields.io/badge/Email-Contact-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:subhashkmsubhash4@gmail.com)

<p align="center">Made with ❤️ by Subhash K M</p>

</div>
