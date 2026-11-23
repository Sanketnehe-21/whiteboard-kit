import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { StyleSheet, View, ViewProps, Platform } from 'react-native'
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

// Safely require native view on Android
const NativeView: React.ComponentType<any> | null =
  Platform.OS === 'android' ? requireNativeViewManager('WhiteboardCanvasView') : null

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
      throw new Error('Native canvas exportToBase64 not available on this platform')
    },
    exportToFile: async (filePath: string, format = 'png', quality = 100) => {
      if (nativeRef.current?.exportToFile) {
        return nativeRef.current.exportToFile(filePath, format, quality)
      }
      throw new Error('Native canvas exportToFile not available on this platform')
    },
  }))

  if (!NativeView) {
    return <View style={[styles.canvas, props.style]} />
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
})
