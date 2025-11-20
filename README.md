# Robo-Scout 🤖

**Robo-Scout** is a retro 8-bit sci-fi RPG built with React, TypeScript, and HTML5 Canvas.

Explore a procedurally generated, neon-lit junkyard grid. Control a squad of bots, fight rogue mechs in turn-based combat, scavenge for scrap, and repair the Escape Pod to survive!

## 🎮 Play Now

You can try the live version of the game here:
**[https://robo-scout-789531219114.us-west1.run.app/](https://robo-scout-789531219114.us-west1.run.app/)**

## ✨ Features

*   **Infinite Exploration**: Procedurally generated terrain with distinct biomes (Walls, Acid Pools, Debris).
*   **Turn-Based Combat**: Strategic battles featuring elemental damage types (Kinetic, Thermal, Electric).
*   **Squad Management**: Recruit defeated enemies ("Hack & Recruit"), manage a team of up to 3 active bots, and store others at your Base Camp.
*   **Class System**: 4 Unique Bot Classes (Scout, Assault, Tank, Tech) with specific skill trees and weaknesses.
*   **Quest System**: A main storyline involving scavenging parts, summoning a Core Guardian boss, and repairing an Escape Pod.
*   **Mobile Optimized**: Touch-friendly interface with Tap-to-Move and context-aware interaction buttons.
*   **Retro Visuals**: All assets are drawn procedurally using the HTML5 Canvas API (no external image files).

## 🛠️ Running Locally

To run this project on your local machine, you'll need [Node.js](https://nodejs.org/) installed. This project is best run using **Vite** with a React TypeScript template.

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/robo-scout.git
    cd robo-scout
    ```

2.  **Install Dependencies**
    *(If starting from scratch, initialize a Vite project first: `npm create vite@latest . -- --template react-ts`)*
    
    ```bash
    npm install
    # You will need tailwindcss, react, and react-dom
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```

3.  **Configure Tailwind**
    Ensure your `tailwind.config.js` looks for your file extensions:
    ```js
    export default {
      content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    }
    ```

4.  **Run the Development Server**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Navigate to `http://localhost:5173` (or the port shown in your terminal).

## 🤝 How to Contribute

We welcome contributions from the community! Whether it's adding new enemy types, balancing skills, or improving the UI.

1.  **Fork the Project**: Click the 'Fork' button at the top right of the repository.
2.  **Create your Feature Branch**:
    ```bash
    git checkout -b feature/AmazingFeature
    ```
3.  **Commit your Changes**:
    ```bash
    git commit -m 'Add some AmazingFeature'
    ```
4.  **Push to the Branch**:
    ```bash
    git push origin feature/AmazingFeature
    ```
5.  **Open a Pull Request**: Go to the original repository and click "New Pull Request".

### Ideas for Contribution
*   **New Modules**: Add more passive upgrades in `constants.ts`.
*   **Sound Effects**: Implement an AudioService using the Web Audio API.
*   **New Biomes**: Add logic for new terrain types in `getTerrainAt`.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
