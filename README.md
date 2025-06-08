# Strategy Game

A turn-based tactical strategy game built with Three.js featuring grid-based combat and squad management.

## Features

- **Turn-based Combat**: Alternating player and AI turns with strategic decision making
- **Grid-based Battlefield**: 12x12 tactical grid with destructible cover positions
- **Action Point System**: Each unit has 2 action points per turn for movement and combat
- **Squad Management**: Control a team of 3 soldiers against enemy forces
- **Cover Mechanics**: Use terrain features for defensive bonuses
- **Camera Controls**: Free camera rotation with mouse drag and zoom with scroll wheel
- **Hit Percentage System**: Distance and cover affect combat accuracy
- **Enemy AI**: Intelligent opponents that move and attack strategically

## Controls

- **Left Click**: Select units and issue movement/attack commands
- **Left Click + Drag**: Rotate camera around battlefield
- **Mouse Wheel**: Zoom in/out
- **End Turn Button**: Complete your turn and let enemies act

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to the local development URL

## Gameplay

- Click on your blue soldiers to select them
- Click on highlighted tiles to move (green = normal move, orange = dash)
- Click on red enemies to attack when in range
- Use cover (brown tiles) for defensive bonuses
- Eliminate all enemies to win

## Technologies

- Three.js for 3D graphics and rendering
- Vite for development server and build tools
- Vanilla JavaScript for game logic