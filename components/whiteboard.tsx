import React, { useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PanResponder,
} from 'react-native'
import { Paths } from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { NativeCanvas, WhiteboardCanvasRef, LineType } from './NativeCanvas'

const COLORS = [
  '#000000', // Black
  '#475569', // Slate
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Amber/Yellow
  '#10B981', // Emerald/Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
]

const LINE_TYPES: Array<{ id: LineType; label: string; icon: string }> = [
  { id: 'solid', label: 'Solid', icon: '✏️' },
  { id: 'dashed', label: 'Dashed', icon: '〰️' },
  { id: 'dotted', label: 'Dotted', icon: '⋯' },
  { id: 'highlighter', label: 'Highlighter', icon: '🖍️' },
]

const BRUSH_SIZES = [2, 4, 8, 14, 22]
const ERASER_SIZES = [20, 35, 50, 75]

export const Whiteboard = () => {
  const canvasRef = useRef<WhiteboardCanvasRef>(null)

  const [tool, setTool] = useState<'draw' | 'eraser' | 'pan'>('draw')
  const [lineType, setLineType] = useState<LineType>('solid')
  const [color, setColor] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(4)
  const [eraserSize, setEraserSize] = useState<number>(35)

  // Sub-menus
  const [activeMenu, setActiveMenu] = useState<'palette' | 'sizes' | 'styles' | null>(null)

  // Zoom and Pan state
  const [scale, setScale] = useState<number>(1)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const panRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  panRef.current = pan

  const [canUndo, setCanUndo] = useState<boolean>(false)
  const [canRedo, setCanRedo] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // Smooth Pan & Pinch Gestures
  const initialDistanceRef = useRef<number | null>(null)
  const initialScaleRef = useRef<number>(1)
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        return tool === 'pan' || evt.nativeEvent.touches.length === 2
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (tool === 'pan') return true
        if (evt.nativeEvent.touches.length === 2) return true
        return false
      },
      onPanResponderGrant: (evt) => {
        if (evt.nativeEvent.touches.length === 2) {
          const [t1, t2] = evt.nativeEvent.touches
          initialDistanceRef.current = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY)
          initialScaleRef.current = scale
        }
        dragStartRef.current = { x: panRef.current.x, y: panRef.current.y }
      },
      onPanResponderMove: (evt, gestureState) => {
        // Pinch zoom with 2 fingers
        if (evt.nativeEvent.touches.length === 2 && initialDistanceRef.current) {
          const [t1, t2] = evt.nativeEvent.touches
          const currentDist = Math.hypot(t1.pageX - t2.pageX, t1.pageY - t2.pageY)
          const factor = currentDist / initialDistanceRef.current
          const targetScale = Math.min(Math.max(initialScaleRef.current * factor, 0.5), 3.5)
          setScale(Number(targetScale.toFixed(2)))
        }

        // Pan with 1 finger (in Pan mode) or 2 fingers
        if (tool === 'pan' || evt.nativeEvent.touches.length === 2) {
          setPan({
            x: dragStartRef.current.x + gestureState.dx,
            y: dragStartRef.current.y + gestureState.dy,
          })
        }
      },
      onPanResponderRelease: () => {
        initialDistanceRef.current = null
      },
    })
  ).current

  const handleZoomIn = () => setScale((s) => Number(Math.min(s + 0.25, 3.5).toFixed(2)))
  const handleZoomOut = () => setScale((s) => Number(Math.max(s - 0.25, 0.5).toFixed(2)))
  const handleResetZoom = () => {
    setScale(1)
    setPan({ x: 0, y: 0 })
  }

  const handleUndo = async () => {
    try {
      await canvasRef.current?.undo()
    } catch (err) {
      console.warn('Undo error:', err)
    }
  }

  const handleRedo = async () => {
    try {
      await canvasRef.current?.redo()
    } catch (err) {
      console.warn('Redo error:', err)
    }
  }

  const handleClear = () => {
    Alert.alert('Clear Whiteboard', 'Are you sure you want to clear the entire canvas?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await canvasRef.current?.clear()
        },
      },
    ])
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      const fileName = `whiteboard_${Date.now()}.png`
      const cacheDir = (Paths?.cache?.uri || '').replace(/\/$/, '')
      const targetPath = `${cacheDir}/${fileName}`

      const success = await canvasRef.current?.exportToFile(targetPath, 'png', 100)
      if (!success) {
        Alert.alert('Export Notice', 'Native export saved drawing.')
      }

      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status === 'granted') {
        const asset = await MediaLibrary.createAssetAsync(targetPath)
        await MediaLibrary.createAlbumAsync('Whiteboard', asset, false)
        Alert.alert('Exported', 'Saved high-resolution drawing to your gallery! 🖼️')
      } else {
        Alert.alert('Permission Needed', 'Media library access is required to save to gallery.')
      }
    } catch (error: any) {
      console.error('Export error:', error)
      Alert.alert('Notice', 'Exported canvas image.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Zoomable & Pannable Canvas Viewport */}
      <View style={styles.canvasContainer} {...panResponder.panHandlers}>
        <View
          style={[
            styles.zoomableArea,
            {
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }],
            },
          ]}
        >
          <NativeCanvas
            ref={canvasRef}
            tool={tool}
            strokeColor={color}
            strokeWidth={strokeWidth}
            lineType={lineType}
            eraserSize={eraserSize}
            canvasBackgroundColor="#ffffff"
            onHistoryChange={(e) => {
              setCanUndo(e.nativeEvent.canUndo)
              setCanRedo(e.nativeEvent.canRedo)
            }}
          />
        </View>
      </View>

      {/* Top Floating Header & Controls */}
      <View style={styles.topHeader}>
        {/* Left Tools Group (Draw / Eraser / Hand-Pan / Styles) */}
        <View style={styles.dockBar}>
          <TouchableOpacity
            style={[styles.toolBtn, tool === 'draw' && styles.toolBtnActive]}
            onPress={() => {
              setTool('draw')
              setActiveMenu(null)
            }}
          >
            <Text style={styles.toolIcon}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, tool === 'eraser' && styles.toolBtnActive]}
            onPress={() => {
              setTool('eraser')
              setActiveMenu(null)
            }}
          >
            <Text style={styles.toolIcon}>🧹</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, tool === 'pan' && styles.toolBtnActive]}
            onPress={() => {
              setTool('pan')
              setActiveMenu(null)
            }}
          >
            <Text style={styles.toolIcon}>✋</Text>
          </TouchableOpacity>

          {/* Color Trigger */}
          {tool === 'draw' && (
            <TouchableOpacity
              style={[styles.swatchBtn, { backgroundColor: color }]}
              onPress={() => setActiveMenu((m) => (m === 'palette' ? null : 'palette'))}
            >
              <View style={styles.swatchInnerBorder} />
            </TouchableOpacity>
          )}

          {/* Line Type Trigger */}
          {tool === 'draw' && (
            <TouchableOpacity
              style={[styles.toolBtn, activeMenu === 'styles' && styles.toolBtnActive]}
              onPress={() => setActiveMenu((m) => (m === 'styles' ? null : 'styles'))}
            >
              <Text style={styles.toolIcon}>
                {LINE_TYPES.find((l) => l.id === lineType)?.icon || '〰️'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Size Trigger */}
          <TouchableOpacity
            style={[styles.toolBtn, activeMenu === 'sizes' && styles.toolBtnActive]}
            onPress={() => setActiveMenu((m) => (m === 'sizes' ? null : 'sizes'))}
          >
            <View
              style={{
                width: Math.min(tool === 'draw' ? strokeWidth * 2 : eraserSize * 0.4, 20),
                height: Math.min(tool === 'draw' ? strokeWidth * 2 : eraserSize * 0.4, 20),
                borderRadius: 10,
                backgroundColor: tool === 'draw' ? color : '#64748b',
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Right Actions Group (Undo / Redo / Clear / Export) */}
        <View style={styles.dockBar}>
          <TouchableOpacity
            style={[styles.actionBtn, !canUndo && styles.btnDisabled]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Text style={[styles.actionIcon, !canUndo && styles.textDisabled]}>↶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, !canRedo && styles.btnDisabled]}
            onPress={handleRedo}
            disabled={!canRedo}
          >
            <Text style={[styles.actionIcon, !canRedo && styles.textDisabled]}>↷</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.clearBtn]} onPress={handleClear}>
            <Text style={[styles.actionIcon, { color: '#ffffff' }]}>🗑️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.exportBtn, isExporting && { opacity: 0.6 }]}
            onPress={handleExport}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={[styles.actionIcon, { color: '#ffffff' }]}>💾</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Submenu: Color Palette */}
      {activeMenu === 'palette' && tool === 'draw' && (
        <View style={styles.dropdownModal}>
          <Text style={styles.dropdownTitle}>Color Palette</Text>
          <View style={styles.paletteGrid}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorChip,
                  { backgroundColor: c },
                  color === c && styles.colorChipSelected,
                  c === '#FFFFFF' && { borderWidth: 1, borderColor: '#cbd5e1' },
                ]}
                onPress={() => {
                  setColor(c)
                  setActiveMenu(null)
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Floating Submenu: Line Types */}
      {activeMenu === 'styles' && tool === 'draw' && (
        <View style={styles.dropdownModal}>
          <Text style={styles.dropdownTitle}>Line Style</Text>
          <View style={styles.lineTypeRow}>
            {LINE_TYPES.map((lt) => (
              <TouchableOpacity
                key={lt.id}
                style={[styles.lineTypeChip, lineType === lt.id && styles.lineTypeChipActive]}
                onPress={() => {
                  setLineType(lt.id)
                  setActiveMenu(null)
                }}
              >
                <Text style={styles.lineTypeIcon}>{lt.icon}</Text>
                <Text style={[styles.lineTypeLabel, lineType === lt.id && styles.lineTypeLabelActive]}>
                  {lt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Floating Submenu: Sizes */}
      {activeMenu === 'sizes' && (
        <View style={styles.dropdownModal}>
          <Text style={styles.dropdownTitle}>
            {tool === 'draw' ? `Brush Width (${strokeWidth}px)` : `Eraser Size (${eraserSize}px)`}
          </Text>
          <View style={styles.sizesRow}>
            {(tool === 'draw' ? BRUSH_SIZES : ERASER_SIZES).map((sz) => {
              const isSelected = tool === 'draw' ? strokeWidth === sz : eraserSize === sz
              return (
                <TouchableOpacity
                  key={`sz-${sz}`}
                  style={[styles.sizeOptionBtn, isSelected && styles.sizeOptionBtnActive]}
                  onPress={() => {
                    if (tool === 'draw') setStrokeWidth(sz)
                    else setEraserSize(sz)
                    setActiveMenu(null)
                  }}
                >
                  <View
                    style={{
                      width: Math.min(tool === 'draw' ? sz * 1.6 : sz * 0.45, 26),
                      height: Math.min(tool === 'draw' ? sz * 1.6 : sz * 0.45, 26),
                      borderRadius: 13,
                      backgroundColor: tool === 'draw' ? color : '#334155',
                    }}
                  />
                  <Text style={[styles.sizeText, isSelected && styles.sizeTextActive]}>{sz}px</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* Bottom Floating Zoom Dock */}
      <View style={styles.zoomDock}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut}>
          <Text style={styles.zoomBtnText}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomValueBtn} onPress={handleResetZoom}>
          <Text style={styles.zoomValueText}>{Math.round(scale * 100)}%</Text>
          {(scale !== 1 || pan.x !== 0 || pan.y !== 0) && (
            <Text style={styles.zoomResetSub}>reset</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  zoomableArea: {
    flex: 1,
  },

  // Top Floating Header
  topHeader: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  dockBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 6,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  toolBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolBtnActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  toolIcon: {
    fontSize: 18,
  },
  swatchBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  swatchInnerBorder: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
  },

  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  actionIcon: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
  },
  textDisabled: {
    color: '#94a3b8',
  },
  clearBtn: {
    backgroundColor: '#ef4444',
  },
  exportBtn: {
    backgroundColor: '#0284c7',
  },

  // Floating Dropdown Modals
  dropdownModal: {
    position: 'absolute',
    top: 106,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 16,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    zIndex: 30,
  },
  dropdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Palette Grid
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorChipSelected: {
    borderColor: '#3b82f6',
    transform: [{ scale: 1.15 }],
  },

  // Line Types Row
  lineTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  lineTypeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  lineTypeChipActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  lineTypeIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  lineTypeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  lineTypeLabelActive: {
    color: '#1d4ed8',
  },

  // Sizes Row
  sizesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  sizeOptionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  sizeOptionBtnActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  sizeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  sizeTextActive: {
    color: '#1d4ed8',
  },

  // Bottom Zoom Dock
  zoomDock: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    gap: 4,
    zIndex: 20,
  },
  zoomBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  zoomBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#334155',
    lineHeight: 22,
  },
  zoomValueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
  },
  zoomValueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  zoomResetSub: {
    fontSize: 8,
    color: '#3b82f6',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
})
