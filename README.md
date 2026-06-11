<p align="center">
  <img src="public/images/logo.png" alt="Vibe Social Logo" width="140px" style="border-radius: 28px; box-shadow: 0 10px 40px rgba(0,0,0,0.15);" />
</p>

<h1 align="center">Vibe Social</h1>

<p align="center">
  <strong>A Premium, High-Fidelity Instagram-Style Social Experience</strong>
</p>

<p align="center">
  <a href="http://localhost:3000"><img src="https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge" alt="Status" /></a>
  <a href="https://github.com/shauryatiwari/Social-Media-App"><img src="https://img.shields.io/badge/Platform-Web-blue?style=for-the-badge" alt="Platform" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=flat-square&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

---

## 🌟 Introduction

Vibe Social is a modern, premium, and fully-featured social media platform modeled after modern platforms like Instagram. Engineered with a clean architecture, it features a fluid, responsive frontend built with pure HTML, custom CSS variables, and vanilla ES6 JavaScript, connected to a robust Node.js and Express backend powered by sql.js.

Designed with high aesthetics and premium micro-interactions, Vibe Social avoids rigid templates and boilerplate frameworks to deliver an authentic, human-designed user interface.

---

## 🚀 Key Features

- **User Authentication:** Secure registration and login flows backed by session-based authentication (express-session) and bcrypt hashing.
- **Stories & Viewed States:** Interactive story rings with neon-gradient active borders that minimize to a simple gray circle once viewed, replicating Instagram's exact user flow.
- **Advanced Profile Customization:** Modify usernames safely with password validation guards, configure custom avatars (with Multer file uploads), and edit pronouns, genders, bios, and links.
- **Meta Verified Tick System:** Purchase verification badges mock flows that dynamically render the official blue verified badge next to usernames across feed posts, captions, recommendations, searches, followers lists, and comments.
- **Explore & Feed:** Explore posts in a responsive 3-column overlay grid with hover details, or scroll through a centralized feed page with follow suggestions.
- **Post Actions & Likes:** Toggle post likes with fluid heart pop animations, support double-tap gestures to like, and CRUD delete functionalities for owner accounts.
- **Followers & Following Networks:** Connect with and unfollow users dynamically, adjusting user statistics in real-time.

---

## 🛠️ Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) installed, then execute:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/dr5t/Social-Media-App.git
   cd Social-Media-App
   ```

2. **Install node dependencies:**
   ```bash
   npm install
   ```

3. **Start the Express server:**
   ```bash
   npm start
   ```

4. **Launch Vibe Social:**
   Open your browser and navigate to `http://localhost:3000`

---

## 👥 Seed Demo Accounts

The local database comes pre-seeded with highly realistic accounts featuring ready-to-view stories, comments, likes, and posts:

| Username | Name | Verification Status | Password |
|---|---|---|---|
| `priya_designs` | Priya Sharma | ✅ Verified (UX Designer) | `password123` |
| `arjun_photography` | Arjun Verma | ❌ Standard (Photographer) | `password123` |

---

## 📄 License & Security

- **Security Guidelines:** See [SECURITY.md](SECURITY.md) for vulnerability disclosure procedures.
- **License:** Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
