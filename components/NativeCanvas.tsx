import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet, View, Text, ViewProps, Platform } from 'react-native'
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

// Safely require native view on Android (wrapped in try-catch for Expo Go compatibility)
let NativeView: React.ComponentType<any> | null = null
try {
  if (Platform.OS === 'android') {
    NativeView = requireNativeViewManager('WhiteboardCanvasView')
  }
} catch (e) {
  // In Expo Go or when native module is not yet compiled
  NativeView = null
}

export const NativeCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardNativeViewProps>((props, ref) => {
  const nativeRef = useRef<any>(null)

  useImperativeHandle(ref, () => ({
    undo: async () => {
      if (nativeRef.current?.undo) {
        return nativeRef.current.undo()
      }
    },
    redo: async () => {
      if (nativeRef.current?.redo) {
        return nativeRef.current.redo()
      }
    },
    clear: async () => {
      if (nativeRef.current?.clear) {
        return nativeRef.current.clear()
      }
    },
    exportToBase64: async (format = 'png', quality = 100) => {
      if (nativeRef.current?.exportToBase64) {
        return nativeRef.current.exportToBase64(format, quality)
      }
      return ''
    },
    exportToFile: async (filePath: string, format = 'png', quality = 100) => {
      if (nativeRef.current?.exportToFile) {
        return nativeRef.current.exportToFile(filePath, format, quality)
      }
      return false
    },
  }))

  if (!NativeView) {
    return (
      <View style={[styles.canvas, styles.fallbackContainer, props.style]}>
        <Text style={styles.fallbackIcon}>⚡</Text>
        <Text style={styles.fallbackTitle}>Hardware-Accelerated Native Canvas</Text>
        <Text style={styles.fallbackDescription}>
          The 120 FPS Kotlin drawing engine contains custom native Android code.
          {'\n\n'}
          Standard <Text style={styles.bold}>Expo Go</Text> cannot run custom native Kotlin modules.
        </Text>
        <View style={styles.pillBox}>
          <Text style={styles.pillLabel}>Run in terminal:</Text>
          <Text style={styles.pillCommand}>npx expo run:android</Text>
        </View>
      </View>
    )
  }

  return (
    <NativeView
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
})

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  fallbackIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  fallbackDescription: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#334155',
  },
  pillBox: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  pillLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  pillCommand: {
    color: '#38bdf8',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
    fontSize: 14,
    fontWeight: '700',
  },
})
