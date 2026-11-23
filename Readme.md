# 🧑‍🏫 rn-whiteboard-kit

<p align="center">
  <img src="https://img.shields.io/badge/performance-120%20FPS%20Native%20Canvas-brightgreen.svg?style=flat-square" alt="Performance" />
  <img src="https://img.shields.io/badge/Expo-SDK%2051--54%2B-black.svg?style=flat-square" alt="Expo" />
  <img src="https://img.shields.io/badge/platform-Android-blue.svg?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg?style=flat-square" alt="License" />
</p>

A high-performance, hardware-accelerated **Native Kotlin Whiteboard & Drawing Canvas** for React Native and Expo.

Built as an ultra-fast, lightweight replacement for glitchy SVG drawing and heavy Skia setups. It executes touch-handling and rendering directly on the Android native hardware thread, delivering locked **120 FPS / 60 FPS** drawing with zero bridge latency.

---

## ⚡ Why Native Canvas Beats SVG & Skia

| Feature | Standard React Native SVG | `@shopify/react-native-skia` | `rn-whiteboard-kit` (Native Kotlin) |
|---|:---:|:---:|:---:|
| **Frame Rate** | Drops to 20–30 FPS on multiple strokes | 60 FPS (heavy setup & bundle size) | **Locked 120 FPS / 60 FPS** |
| **Touch Latency** | 100–300ms bridge delay | 20–50ms | **Zero Latency (< 8ms)** |
| **Drawing Model** | React state updates on every pixel | Canvas shader pipeline | Direct `android.graphics.Canvas` with double buffering |
| **Eraser** | Fake (paints white lines) | Shader mask | **True Eraser** (`PorterDuff.Mode.CLEAR`) |
| **Curve Smoothing** | Blocky/jagged (`L x y`) | Custom spline code | **Smooth Quadratic Beziers (`quadTo`)** |
| **Export** | Viewport screenshot hack (`viewShot`) | Skia Image encoding | **Direct `Bitmap.compress(PNG)` offscreen** |

---

## ✨ Features

* ✍️ **120 FPS Hardware-Accelerated Freehand Drawing**: Native double-buffered `Bitmap` with hardware layer rendering.
* ➰ **Smooth Quadratic Beziers**: Automatically calculates midpoint quadratic curves for natural, pen-like handwriting.
* 🧹 **True Alpha Eraser**: Real pixel erasing using native `PorterDuff.Mode.CLEAR` (does not paint white strokes).
* ↩️ **Native Undo / Redo**: High-speed stroke history stack with automated canvas replay.
* 🎨 **Adjustable Palette & Stroke Width**: Full color support and dynamic brush/eraser sizing.
* 💾 **Direct High-Res PNG Export**: Renders the complete vector stroke history directly to an offscreen bitmap in < 10ms.
* 🧩 **Expo Modules API**: Seamlessly autolinked with `npx expo prebuild` and EAS Build.

---

## 🚀 Installation

```bash
# In your Expo or React Native project:
npm install rn-whiteboard-kit
npx expo install expo-file-system expo-media-library
```

> **Note:** Requires an Expo Development Build or Bare React Native project (`npx expo run:android` or `eas build`).

---

## 🧱 Quick Start

### Ready-To-Use Component (With Built-in Toolbar)

```tsx
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Whiteboard } from 'rn-whiteboard-kit'

export default function App() {
  return (
    <View style={styles.container}>
      <Whiteboard />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
})
```

---

### Custom UI via `NativeCanvas` Ref API

If you want to build your own custom toolbar or drawing app interface:

```tsx
import React, { useRef } from 'react'
import { View, Button } from 'react-native'
import { NativeCanvas, WhiteboardCanvasRef } from 'rn-whiteboard-kit'

export default function CustomWhiteboard() {
  const canvasRef = useRef<WhiteboardCanvasRef>(null)

  return (
    <View style={{ flex: 1 }}>
      <NativeCanvas
        ref={canvasRef}
        tool="draw"
        strokeColor="#007AFF"
        strokeWidth={6}
        eraserSize={40}
        canvasBackgroundColor="#ffffff"
        onHistoryChange={({ nativeEvent }) => {
          console.log('Can undo:', nativeEvent.canUndo)
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 16 }}>
        <Button title="Undo" onPress={() => canvasRef.current?.undo()} />
        <Button title="Redo" onPress={() => canvasRef.current?.redo()} />
        <Button title="Clear" onPress={() => canvasRef.current?.clear()} />
        <Button
          title="Export"
          onPress={async () => {
            const base64 = await canvasRef.current?.exportToBase64('png')
            console.log('Exported Base64 PNG length:', base64?.length)
          }}
        />
      </View>
    </View>
  )
}
```

---

## 🛠️ Canvas Ref API

| Method | Parameters | Returns | Description |
|---|---|---|---|
| `undo()` | - | `Promise<void>` | Undoes the last stroke. |
| `redo()` | - | `Promise<void>` | Redoes the last undone stroke. |
| `clear()` | - | `Promise<void>` | Clears the entire canvas. |
| `exportToBase64(format?, quality?)` | `format`: `'png' \| 'jpeg' \| 'png_transparent'`, `quality`: `1-100` | `Promise<string>` | Exports the drawing to a Base64 string in < 10ms. |
| `exportToFile(filePath, format?, quality?)` | `filePath`: string, `format`?: string, `quality`?: number | `Promise<boolean>` | Writes high-resolution bitmap directly to target file. |

---

## 📄 License

MIT © [Sanket Nehe](https://github.com/Sanketnehe-21)
