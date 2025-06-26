21-06-2025-->26-06-2025

# 🧑‍🏫 rn-whiteboard-kit

**`rn-whiteboard-kit`** is a lightweight, customizable whiteboard component for React Native built with Expo. It provides a cross-platform drawing experience with zoom, pan, eraser, undo/redo, and PNG export support — perfect for collaboration apps, brainstorming tools, and classroom utilities.

## ✨ Features

* ✍️ Freehand drawing (SVG paths)
* 🧽 Eraser tool with adjustable size
* 🔙 Undo / Redo support
* 🔍 Pinch-to-zoom and pan with 2 fingers
* 🎨 Adjustable stroke size and color
* 🖼️ Export to PNG (saved to gallery)
* 🧩 Easy to integrate as a package or component
* 📱 Works on Android, iOS, and Web (via Expo)

## 🚀 Installation

```bash
npm install rn-whiteboard-kit
# or
yarn add rn-whiteboard-kit
```

> Note: You must be using an [Expo](https://expo.dev/) or [Expo-compatible](https://docs.expo.dev/bare/installing-expo-modules/) project.

Also ensure the following peer dependencies are installed:

```bash
npx expo install react-native-svg react-native-reanimated react-native-gesture-handler react-native-view-shot expo-media-library
```

### Extra Setup (Required for Gesture & Reanimated)

Add this to your `babel.config.js`:

```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['react-native-reanimated/plugin'],
};
```

Wrap your root component with `GestureHandlerRootView`.

## 🧱 Usage

```tsx
import { Whiteboard } from 'rn-whiteboard-kit'

export default function App() {
  return <Whiteboard />
}
```

## 📸 Features in Action

| Tool      | Screenshot                  |
| --------- | --------------------------- |
| Draw      | ✏️ Smooth drawing           |
| Eraser    | 🧽 White erase overlay      |
| Zoom      | 🔍 Pinch to zoom            |
| Undo/Redo | ↩️/↪️ Drawing history       |
| Export    | 🖼️ Saves as PNG in gallery |

## 🛠️ API

The `<Whiteboard />` component is ready to use as-is. Internally, it uses the `useWhiteboard()` hook which provides:

```ts
{
  strokes,
  currentStroke,
  startStroke(),
  addPoint(),
  endStroke(),
  undo(),
  redo(),
  clearAll(),
  tool, setTool(),
  strokeWidth, setStrokeWidth(),
  eraserSize, setEraserSize(),
  strokeWidths, eraserSizes
}
```

## 📦 Planned Features

* 🧠 Text input / Sticky notes
* 🌐 Real-time collaboration via Firebase/WebSocket
* 🧪 Testing coverage
* 💾 SVG/JSON import/export
* 🧩 Plugin tool system (extensible tools)

## 🤝 Contributing

Pull requests, bug fixes, and feature discussions are welcome! Open an issue or start a discussion if you'd like to contribute.

## 🪪 License

MIT © 2025 [sanket](https://github.com/Sanketnehe-21)

