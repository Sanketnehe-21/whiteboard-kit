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
import Svg, { Path } from 'react-native-svg'

export type LineType = 'solid' | 'dashed' | 'dotted' | 'highlighter'

export interface WhiteboardNativeViewProps extends ViewProps {
  strokeColor?: string
  strokeWidth?: number
  tool?: 'draw' | 'eraser' | 'pan'
  eraserSize?: number
  lineType?: LineType
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

interface StrokeRecord {
  path: Array<{ x: number; y: number }>
  color: string
  width: number
  isEraser: boolean
  lineType: LineType
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

// Convert points to SVG quadratic bezier curve path
const pointsToSvgPath = (points: Array<{ x: number; y: number }>): string => {
  if (!points || points.length === 0) return ''
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`
  }

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1]
    const p2 = points[i]
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2
    d += ` Q ${p1.x} ${p1.y}, ${midX} ${midY}`
  }
  const last = points[points.length - 1]
  d += ` L ${last.x} ${last.y}`
  return d
}

export const NativeCanvas = forwardRef<WhiteboardCanvasRef, WhiteboardNativeViewProps>((props, ref) => {
  const nativeRef = useRef<any>(null)

  // Persistent refs to PREVENT STALE CLOSURES (guarantees strokes NEVER vanish!)
  const strokesRef = useRef<StrokeRecord[]>([])
  const redoStackRef = useRef<StrokeRecord[]>([])
  const currentPathRef = useRef<Array<{ x: number; y: number }>>([])

  // State to trigger re-renders
  const [strokesState, setStrokesState] = useState<StrokeRecord[]>([])
  const [currentPathState, setCurrentPathState] = useState<Array<{ x: number; y: number }>>([])

  // Notify history changes safely outside React render/state updater loop
  const notifyHistory = () => {
    const strokesCount = strokesRef.current.length
    const redosCount = redoStackRef.current.length
    setTimeout(() => {
      props.onHistoryChange?.({
        nativeEvent: {
          canUndo: strokesCount > 0,
          canRedo: redosCount > 0,
          strokeCount: strokesCount,
        },
      })
    }, 0)
  }

  useImperativeHandle(ref, () => ({
    undo: async () => {
      if (isNativeAvailable && nativeRef.current?.undo) {
        return nativeRef.current.undo()
      }
      if (strokesRef.current.length === 0) return
      const popped = strokesRef.current.pop()!
      redoStackRef.current.push(popped)
      setStrokesState([...strokesRef.current])
      notifyHistory()
    },
    redo: async () => {
      if (isNativeAvailable && nativeRef.current?.redo) {
        return nativeRef.current.redo()
      }
      if (redoStackRef.current.length === 0) return
      const restored = redoStackRef.current.pop()!
      strokesRef.current.push(restored)
      setStrokesState([...strokesRef.current])
      notifyHistory()
    },
    clear: async () => {
      if (isNativeAvailable && nativeRef.current?.clear) {
        return nativeRef.current.clear()
      }
      strokesRef.current = []
      redoStackRef.current = []
      currentPathRef.current = []
      setStrokesState([])
      setCurrentPathState([])
      notifyHistory()
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

  // Touch responder for continuous drawing
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return props.tool !== 'pan' && evt.nativeEvent.touches.length === 1
      },
      onMoveShouldSetPanResponder: (evt) => {
        return props.tool !== 'pan' && evt.nativeEvent.touches.length === 1
      },
      onPanResponderGrant: (evt) => {
        if (props.tool === 'pan' || evt.nativeEvent.touches.length > 1) return
        const { locationX, locationY } = evt.nativeEvent
        currentPathRef.current = [{ x: locationX, y: locationY }]
        setCurrentPathState([{ x: locationX, y: locationY }])
        props.onStrokeStart?.()
      },
      onPanResponderMove: (evt) => {
        if (props.tool === 'pan' || evt.nativeEvent.touches.length > 1) return
        const { locationX, locationY } = evt.nativeEvent
        currentPathRef.current.push({ x: locationX, y: locationY })
        setCurrentPathState([...currentPathRef.current])
      },
      onPanResponderRelease: () => {
        if (props.tool === 'pan') return
        if (currentPathRef.current.length > 0) {
          const isEraser = props.tool === 'eraser'
          const newStroke: StrokeRecord = {
            path: [...currentPathRef.current],
            color: isEraser ? props.canvasBackgroundColor || '#ffffff' : props.strokeColor || '#000000',
            width: isEraser ? props.eraserSize || 35 : props.strokeWidth || 4,
            isEraser,
            lineType: props.lineType || 'solid',
          }

          // Append to persistent ref (NEVER loses previous strokes!)
          strokesRef.current.push(newStroke)
          redoStackRef.current = []
          setStrokesState([...strokesRef.current])

          currentPathRef.current = []
          setCurrentPathState([])
          notifyHistory()
        }
        props.onStrokeEnd?.()
      },
    })
  ).current

  // 120 FPS hardware-accelerated Native Canvas (Compiled development builds)
  if (isNativeAvailable && NativeViewComponent) {
    return (
      <NativeViewComponent
        ref={nativeRef}
        style={[styles.canvas, props.style]}
        strokeColor={props.strokeColor ?? '#000000'}
        strokeWidth={props.strokeWidth ?? 4}
        tool={props.tool === 'pan' ? 'draw' : (props.tool ?? 'draw')}
        lineType={props.lineType ?? 'solid'}
        eraserSize={props.eraserSize ?? 35}
        canvasBackgroundColor={props.canvasBackgroundColor ?? '#ffffff'}
        onStrokeStart={props.onStrokeStart}
        onStrokeEnd={props.onStrokeEnd}
        onHistoryChange={props.onHistoryChange}
      />
    )
  }

  // Smooth continuous vector line drawing in Expo Go / preview mode
  return (
    <View style={[styles.canvas, props.style]} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        {strokesState.map((s, idx) => {
          const d = pointsToSvgPath(s.path)
          const isHighlighter = s.lineType === 'highlighter'
          const isDashed = s.lineType === 'dashed'
          const isDotted = s.lineType === 'dotted'

          return (
            <Path
              key={`stroke-${idx}`}
              d={d}
              stroke={s.color}
              strokeWidth={isHighlighter ? s.width * 2.2 : s.width}
              fill="none"
              strokeLinecap={isHighlighter ? 'square' : 'round'}
              strokeLinejoin="round"
              strokeDasharray={isDashed ? `${s.width * 2.5}, ${s.width * 2}` : isDotted ? `1, ${s.width * 2.5}` : undefined}
              opacity={isHighlighter ? 0.45 : 1}
            />
          )
        })}

        {currentPathState.length > 0 && (
          <Path
            d={pointsToSvgPath(currentPathState)}
            stroke={props.tool === 'eraser' ? props.canvasBackgroundColor || '#ffffff' : props.strokeColor || '#000000'}
            strokeWidth={props.tool === 'eraser' ? props.eraserSize || 35 : (props.lineType === 'highlighter' ? (props.strokeWidth || 4) * 2.2 : props.strokeWidth || 4)}
            fill="none"
            strokeLinecap={props.lineType === 'highlighter' ? 'square' : 'round'}
            strokeLinejoin="round"
            strokeDasharray={props.lineType === 'dashed' ? `${(props.strokeWidth || 4) * 2.5}, ${(props.strokeWidth || 4) * 2}` : props.lineType === 'dotted' ? `1, ${(props.strokeWidth || 4) * 2.5}` : undefined}
            opacity={props.lineType === 'highlighter' ? 0.45 : 1}
          />
        )}
      </Svg>
    </View>
  )
})

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
})
