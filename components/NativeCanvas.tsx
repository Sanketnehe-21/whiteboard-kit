import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import {
  StyleSheet,
  View,
  Text,
  ViewProps,
  Platform,
  UIManager,
  PanResponder,
} from 'react-native'
import { requireNativeViewManager } from 'expo-modules-core'

export interface WhiteboardNativeViewProps extends ViewProps {
  strokeColor?: string
  strokeWidth?: number
  tool?: 'draw' | 'eraser'
  eraserSize?: number
  canvasBackgroundColor?: string
  onStrokeStart?: () => void
  onStrokeEnd?: () => void
  onHistoryChange?: (event: { nativeEvent: { canUndo: boolean; canRedo: boolean; strokeCount: number } }) => void
}

export interface WhiteboardCanvasRef {
  undo: () => Promise<void>
  redo: () => Promise<void>
  clear: () => Promise<void>
  exportToBase64: (format?: 'png' | 'jpeg' | 'png_transparent', quality?: number) => Promise<string>
  exportToFile: (filePath: string, format?: 'png' | 'jpeg' | 'png_transparent', quality?: number) => Promise<boolean>
}

// Check if the native Android ViewManager is actually compiled and linked in the current runtime
const checkNativeAvailable = (): boolean => {
  if (Platform.OS !== 'android') return false
  try {
    const hasConfig =
      UIManager.getViewManagerConfig?.('ViewManagerAdapter_WhiteboardCanvasView') ||
      UIManager.getViewManagerConfig?.('WhiteboardCanvasView') ||
      (UIManager as any)['ViewManagerAdapter_WhiteboardCanvasView']
    return Boolean(hasConfig)
  } catch {
    return false
  }
}

const isNativeAvailable = checkNativeAvailable()

let NativeViewComponent: React.ComponentType<any> | null = null
if (isNativeAvailable) {
  try {
    NativeViewComponent = requireNativeViewManager('WhiteboardCanvasView')
  } catch {
    NativeViewComponent = null
  }
}

export const NativeCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardNativeViewProps>((props, ref) => {
  const nativeRef = useRef<any>(null)

  // In-memory fallback state for Expo Go / preview mode
  const [fallbackStrokes, setFallbackStrokes] = useState<
    Array<{ path: Array<{ x: number; y: number }>; color: string; width: number; isEraser: boolean }>
  >([])
  const [currentFallbackPath, setCurrentFallbackPath] = useState<Array<{ x: number; y: number }>>([])
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([])

  useImperativeHandle(ref, () => ({
    undo: async () => {
      if (isNativeAvailable && nativeRef.current?.undo) {
        return nativeRef.current.undo()
      }
      setFallbackStrokes((prev) => prev.slice(0, -1))
    },
    redo: async () => {
      if (isNativeAvailable && nativeRef.current?.redo) {
        return nativeRef.current.redo()
      }
    },
    clear: async () => {
      if (isNativeAvailable && nativeRef.current?.clear) {
        return nativeRef.current.clear()
      }
      setFallbackStrokes([])
      setCurrentFallbackPath([])
    },
    exportToBase64: async (format = 'png', quality = 100) => {
      if (isNativeAvailable && nativeRef.current?.exportToBase64) {
        return nativeRef.current.exportToBase64(format, quality)
      }
      return ''
    },
    exportToFile: async (filePath: string, format = 'png', quality = 100) => {
      if (isNativeAvailable && nativeRef.current?.exportToFile) {
        return nativeRef.current.exportToFile(filePath, format, quality)
      }
      return false
    },
  }))

  // Fallback PanResponder for Expo Go
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        currentPathRef.current = [{ x: locationX, y: locationY }]
        setCurrentFallbackPath([{ x: locationX, y: locationY }])
        props.onStrokeStart?.()
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent
        currentPathRef.current = [...currentPathRef.current, { x: locationX, y: locationY }]
        setCurrentFallbackPath([...currentPathRef.current])
      },
      onPanResponderRelease: () => {
        if (currentPathRef.current.length > 0) {
          const newStroke = {
            path: currentPathRef.current,
            color: props.tool === 'eraser' ? '#ffffff' : props.strokeColor || '#000000',
            width: props.tool === 'eraser' ? props.eraserSize || 40 : props.strokeWidth || 6,
            isEraser: props.tool === 'eraser',
          }
          setFallbackStrokes((prev) => {
            const next = [...prev, newStroke]
            props.onHistoryChange?.({
              nativeEvent: { canUndo: next.length > 0, canRedo: false, strokeCount: next.length },
            })
            return next
          })
          currentPathRef.current = []
          setCurrentFallbackPath([])
        }
        props.onStrokeEnd?.()
      },
    })
  ).current

  // If native view is compiled into the app, render 120 FPS hardware-accelerated canvas
  if (isNativeAvailable && NativeViewComponent) {
    return (
      <NativeViewComponent
        ref={nativeRef}
        style={[styles.canvas, props.style]}
        strokeColor={props.strokeColor ?? '#000000'}
        strokeWidth={props.strokeWidth ?? 6}
        tool={props.tool ?? 'draw'}
        eraserSize={props.eraserSize ?? 40}
        canvasBackgroundColor={props.canvasBackgroundColor ?? '#ffffff'}
        onStrokeStart={props.onStrokeStart}
        onStrokeEnd={props.onStrokeEnd}
        onHistoryChange={props.onHistoryChange}
      />
    )
  }

  // Fallback for Expo Go (Interactive Preview)
  return (
    <View style={[styles.canvas, props.style]} {...panResponder.panHandlers}>
      {/* Banner informing developer how to activate 120 FPS native module */}
      <View style={styles.expoGoBanner}>
        <Text style={styles.expoGoBannerTitle}>
          ℹ️ Expo Go Preview Mode (Native Kotlin module requires <Text style={styles.codeText}>npx expo run:android</Text>)
        </Text>
      </View>

      {/* Render strokes in preview mode */}
      {fallbackStrokes.map((stroke, idx) => (
        <View key={idx} style={StyleSheet.absoluteFill} pointerEvents="none">
          {stroke.path.map((pt, pIdx) => (
            <View
              key={pIdx}
              style={{
                position: 'absolute',
                left: pt.x - stroke.width / 2,
                top: pt.y - stroke.width / 2,
                width: stroke.width,
                height: stroke.width,
                borderRadius: stroke.width / 2,
                backgroundColor: stroke.color,
              }}
            />
          ))}
        </View>
      ))}

      {currentFallbackPath.map((pt, pIdx) => (
        <View
          key={`current-${pIdx}`}
          style={{
            position: 'absolute',
            left: pt.x - (props.strokeWidth || 6) / 2,
            top: pt.y - (props.strokeWidth || 6) / 2,
            width: props.strokeWidth || 6,
            height: props.strokeWidth || 6,
            borderRadius: (props.strokeWidth || 6) / 2,
            backgroundColor: props.tool === 'eraser' ? '#ffffff' : props.strokeColor || '#000000',
          }}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  expoGoBanner: {
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#dbeafe',
    alignItems: 'center',
    zIndex: 10,
  },
  expoGoBannerTitle: {
    fontSize: 11,
    color: '#1e40af',
    fontWeight: '600',
  },
  codeText: {
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontWeight: '700',
    color: '#2563eb',
  },
})
