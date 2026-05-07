# DropSpace

**The fastest way to seamlessly share files, links, and text across your devices securely.**

DropSpace eliminates the friction of moving a file, link, or chunk of text from your phone to your computer (and vice versa). No more emailing yourself, using heavy messaging apps, or dealing with cloud drive sync delays—just scan and share.

![DropSpace Preview](https://github.com/user-attachments/assets/placeholder-image) <!-- Add a screenshot here later -->

## ✨ Features

- 📱 **Instant Pairing:** Scan a desktop QR code using your mobile device's camera to instantly connect them. No accounts or logins required.
- ⚡ **Lightning Fast Transfer:** Send files, web links, and text between devices instantly.
- 🔒 **Secure Connection:** Temporary pairing means data is only shared with the device actively connected in your session. Once the tab is closed, the session is destroyed.
- 📁 **Universal File Support:** Easily handle high-res images, videos, PDFs, zip archives, or raw strings of text.
- 🎨 **Beautiful UI:** A polished, highly-responsive design heavily optimized for both desktop browsers and mobile touchscreens with fluid animations.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- `npm` or `yarn`

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/dropspace.git
   cd dropspace
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:** Navigate to `http://localhost:3000` to start a session.

## 🛠️ Built With

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion
- **Backend:** Node.js, Express, Socket.IO
- **Icons:** Lucide React

## 📝 How It Works

1. **Host a Session:** Open DropSpace on your desktop browser. The app instantly acts as a host and generates a unique QR code.
2. **Scan & Connect:** Scan the QR code with your mobile device. The mobile browser opens DropSpace and joins the secure Socket.IO room.
3. **Transfer:** You can now drag and drop files on your desktop, or use the mobile upload button, to send data bidirectionally.
4. **Disconnect:** Simply close the browser tab. The secure session is immediately terminated.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/your-username/dropspace/issues) if you want to contribute.

## 📄 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.
