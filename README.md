# Vibe Social

Vibe Social is a modern, premium, full-stack social media web application. It features a clean Instagram-style UI built from the ground up with pure HTML, CSS, and vanilla JavaScript (no frontend frameworks). The backend is powered by Node.js, Express, and SQLite.

![Vibe Logo](/public/images/logo.png)

## Features

- **User Authentication:** Secure register, login, and session-based authentication (bcrypt & express-session).
- **Feed & Explore:** Scrollable posts from followed users and a global explore grid.
- **Stories System:** Instagram-style click-to-view stories with progress bars and viewed states.
- **Interactions:** Like (double tap to like with animation), comment, and follow/unfollow users.
- **Real-Time Search:** Client-side debounced user search.
- **Profile Customization:** Upload avatars, update bios, and display names.
- **Image Uploads:** Drag-and-drop post creation using `multer` for local storage.
- **Modern UI/UX:** Styled using pure CSS with Plus Jakarta Sans, SVG iconography, and fluid animations.

## Tech Stack

- **Frontend:** HTML5, CSS3 (Custom Variables, Flexbox/Grid), Vanilla ES6 JavaScript
- **Backend:** Node.js, Express.js
- **Database:** SQLite (via `sql.js`)
- **Assets:** AI-generated avatars and modern minimalist SVGs.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/shauryatiwari/Social-Media-App.git
   cd Social-Media-App
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## Demo Accounts

The database comes pre-seeded with Indian demographic demo accounts. You can log in immediately using:

- **Username:** `priya_designs` / **Password:** `password123`
- **Username:** `arjun_photography` / **Password:** `password123`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
