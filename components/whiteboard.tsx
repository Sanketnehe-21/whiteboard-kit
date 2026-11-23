import React, { useRef, useState } from 'react'
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { Paths } from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import { NativeCanvas, WhiteboardCanvasRef } from './NativeCanvas'

const COLORS = [
  '#000000', // Black
  '#FF3B30', // Red
  '#007AFF', // Blue
  '#34C759', // Green
  '#FF9500', // Orange
  '#AF52DE', // Purple
  '#FF2D92', // Pink
  '#FFCC00', // Yellow
  '#8E8E93', // Gray
  '#00C7BE', // Teal
]

const BRUSH_SIZES = [2, 4, 6, 8, 12, 16, 20]
const ERASER_SIZES = [20, 30, 40, 60, 80]

export const Whiteboard = () => {
  const canvasRef = useRef<WhiteboardCanvasRef>(null)

  const [tool, setTool] = useState<'draw' | 'eraser'>('draw')
  const [color, setColor] = useState<string>('#000000')
  const [strokeWidth, setStrokeWidth] = useState<number>(6)
  const [eraserSize, setEraserSize] = useState<number>(40)
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false)
  const [canUndo, setCanUndo] = useState<boolean>(false)
  const [canRedo, setCanRedo] = useState<boolean>(false)
  const [isExporting, setIsExporting] = useState<boolean>(false)

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
        Alert.alert('Export Failed', 'Could not render high-resolution canvas')
        return
      }

      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Media library access is required to save to gallery.')
        return
      }

      const asset = await MediaLibrary.createAssetAsync(targetPath)
      await MediaLibrary.createAlbumAsync('Whiteboard', asset, false)
      Alert.alert('Success', 'Saved high-resolution drawing to your gallery! 🖼️')
    } catch (error: any) {
      console.error('Export error:', error)
      Alert.alert('Error', error?.message || 'Failed to export image')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <View style={styles.container}>
      {/* Hardware-Accelerated Native Canvas */}
      <View style={styles.canvasWrapper}>
        <NativeCanvas
          ref={canvasRef}
          tool={tool}
          strokeColor={color}
          strokeWidth={strokeWidth}
          eraserSize={eraserSize}
          canvasBackgroundColor="#ffffff"
          onHistoryChange={(e) => {
            setCanUndo(e.nativeEvent.canUndo)
            setCanRedo(e.nativeEvent.canRedo)
          }}
        />
      </View>

      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        {/* Tool Selector */}
        <View style={styles.toolContainer}>
          <TouchableOpacity
            style={[styles.toolButton, tool === 'draw' && styles.activeButton]}
            onPress={() => setTool('draw')}
          >
            <Text style={styles.toolText}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolButton, tool === 'eraser' && styles.activeButton]}
            onPress={() => setTool('eraser')}
          >
            <Text style={styles.toolText}>🧹</Text>
          </TouchableOpacity>

          {tool === 'draw' && (
            <TouchableOpacity
              style={[styles.colorButton, { backgroundColor: color }]}
              onPress={() => setShowColorPicker(!showColorPicker)}
            >
              <Text style={styles.colorButtonText}>🎨</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Controls (Undo / Redo / Clear) */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, !canUndo && styles.disabledButton]}
            onPress={handleUndo}
            disabled={!canUndo}
          >
            <Text style={[styles.actionText, !canUndo && styles.disabledText]}>↶</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, !canRedo && styles.disabledButton]}
            onPress={handleRedo}
            disabled={!canRedo}
          >
            <Text style={[styles.actionText, !canRedo && styles.disabledText]}>↷</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={handleClear}>
            <Text style={[styles.actionText, { color: '#fff' }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Color Palette */}
      {showColorPicker && tool === 'draw' && (
        <View style={styles.colorPicker}>
          <Text style={styles.colorPickerTitle}>Palette</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorOption,
                  { backgroundColor: c },
                  color === c && styles.selectedColor,
                ]}
                onPress={() => {
                  setColor(c)
                  setShowColorPicker(false)
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Brush Size Selector */}
      {tool === 'draw' && (
        <View style={styles.sizeContainer}>
          <Text style={styles.sizeLabel}>Brush Size ({strokeWidth}px)</Text>
          <View style={styles.sizeOptions}>
            {BRUSH_SIZES.map((width) => (
              <TouchableOpacity
                key={`stroke-${width}`}
                style={[styles.sizeButton, strokeWidth === width && styles.activeSizeButton]}
                onPress={() => setStrokeWidth(width)}
              >
                <View
                  style={{
                    width: Math.min(width * 1.5, 22),
                    height: Math.min(width * 1.5, 22),
                    borderRadius: Math.min(width * 1.5, 22) / 2,
                    backgroundColor: color,
                  }}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Eraser Size Selector */}
      {tool === 'eraser' && (
        <View style={styles.sizeContainer}>
          <Text style={styles.sizeLabel}>Eraser Size ({eraserSize}px)</Text>
          <View style={styles.sizeOptions}>
            {ERASER_SIZES.map((size) => (
              <TouchableOpacity
                key={`eraser-${size}`}
                style={[styles.sizeButton, eraserSize === size && styles.activeSizeButton]}
                onPress={() => setEraserSize(size)}
              >
                <Text style={styles.sizeButtonText}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Export Button */}
      <TouchableOpacity
        style={[styles.exportButton, isExporting && { opacity: 0.7 }]}
        onPress={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.exportButtonText}>💾 Export PNG</Text>
        )}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  canvasWrapper: {
    flex: 1,
    margin: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },

  // Top Toolbar
  topToolbar: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  toolContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 6,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    gap: 8,
  },
  toolButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  toolText: {
    fontSize: 20,
  },
  colorButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  colorButtonText: {
    fontSize: 16,
  },

  // Action Container
  actionContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 6,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    gap: 8,
  },
  actionButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
  },
  disabledButton: {
    opacity: 0.35,
  },
  disabledText: {
    color: '#94a3b8',
  },
  clearButton: {
    backgroundColor: '#EF4444',
  },
  actionText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },

  // Color Picker
  colorPicker: {
    position: 'absolute',
    top: 114,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 16,
    borderRadius: 18,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    zIndex: 20,
  },
  colorPickerTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    color: '#334155',
    textAlign: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#007AFF',
    transform: [{ scale: 1.15 }],
  },

  // Size Container
  sizeContainer: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    padding: 14,
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    zIndex: 10,
  },
  sizeLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: '#475569',
    textAlign: 'center',
  },
  sizeOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  sizeButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 21,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeSizeButton: {
    borderColor: '#007AFF',
    backgroundColor: '#eff6ff',
  },
  sizeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  // Export Button
  exportButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    zIndex: 10,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
})
