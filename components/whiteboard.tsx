// Enhanced Whiteboard.tsx
import React, { useRef, useState, useEffect } from 'react'
import { View, StyleSheet, Text, TouchableOpacity, Animated as RNAnimated } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import ViewShot, { captureRef } from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'
import Animated, { useSharedValue, useAnimatedStyle, runOnJS, withSpring, withTiming } from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useWhiteboard, Point } from '../hooks/useWhiteboard'

// Color palette
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

export const Whiteboard = () => {
  const viewShotRef = useRef(null)
  const zoomAlertOpacity = useRef(new RNAnimated.Value(0)).current

  const {
    strokes,
    currentStroke,
    startStroke,
    addPoint,
    endStroke,
    undo,
    redo,
    clearAll,
    tool,
    setTool,
    strokeWidth,
    setStrokeWidth,
    eraserSize,
    setEraserSize,
    strokeWidths,
    eraserSizes,
    color,
    setColor,
  } = useWhiteboard()

  const [indicatorPosition, setIndicatorPosition] = useState(null)
  const [showColorPicker, setShowColorPicker] = useState(false)

  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  // Zoom alert function
  const showZoomAlert = () => {
    RNAnimated.sequence([
      RNAnimated.timing(zoomAlertOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.delay(1500),
      RNAnimated.timing(zoomAlertOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start()
  }

  // Monitor zoom level
  useEffect(() => {
    if (Math.abs(scale.value - 1) < 0.01) {
      showZoomAlert()
    }
  }, [scale.value])

  // Gestures
  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart((e) => {
      const point = {
        x: (e.x - translateX.value) / scale.value,
        y: (e.y - translateY.value) / scale.value,
      }
      runOnJS(startStroke)(point)
      if (tool === 'eraser') runOnJS(setIndicatorPosition)(point)
    })
    .onUpdate((e) => {
      const point = {
        x: (e.x - translateX.value) / scale.value,
        y: (e.y - translateY.value) / scale.value,
      }
      runOnJS(addPoint)(point)
      if (tool === 'eraser') runOnJS(setIndicatorPosition)(point)
    })
    .onEnd(() => {
      runOnJS(endStroke)()
      if (tool === 'eraser') runOnJS(setIndicatorPosition)(null)
    })

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(3, savedScale.value * e.scale))
    })
    .onEnd(() => {
      savedScale.value = scale.value
      // Check if zoomed out to 100%
      if (Math.abs(scale.value - 1) < 0.01) {
        runOnJS(showZoomAlert)()
      }
    })

  const panGesture = Gesture.Pan()
    .minPointers(2)
    .maxPointers(2)
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX
      translateY.value = savedTranslateY.value + e.translationY
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })

  const twoFingerGesture = Gesture.Simultaneous(pinchGesture, panGesture)
  const composed = Gesture.Race(twoFingerGesture, drawGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  const renderPath = (stroke, key) => {
    if (!stroke || stroke.points.length < 2) return null
    const d = stroke.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <Path
        key={key}
        d={d}
        stroke={stroke.tool === 'eraser' ? '#fff' : stroke.color || '#000'}
        strokeWidth={stroke.strokeWidth / scale.value}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  return (
    <View style={styles.container}>
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1.0 }} style={styles.canvas}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.canvas, animatedStyle]}>
            <Svg style={styles.svg}>
              {strokes.map(renderPath)}
              {currentStroke && renderPath(currentStroke, -1)}
              {tool === 'eraser' && indicatorPosition && (
                <Circle
                  cx={indicatorPosition.x}
                  cy={indicatorPosition.y}
                  r={eraserSize / 2 / scale.value}
                  fill="rgba(200,200,200,0.5)"
                  stroke="gray"
                  strokeWidth={1 / scale.value}
                />
              )}
            </Svg>
          </Animated.View>
        </GestureDetector>
      </ViewShot>

      {/* Zoom Alert */}
      <RNAnimated.View style={[styles.zoomAlert, { opacity: zoomAlertOpacity }]} pointerEvents="none">
        <View style={styles.zoomAlertContainer}>
          <Text style={styles.zoomAlertText}>100% Zoom</Text>
        </View>
      </RNAnimated.View>

      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        <View style={styles.toolContainer}>
          <TouchableOpacity 
            style={[styles.toolButton, tool === 'draw' && styles.activeButton]} 
            onPress={() => setTool('draw')}
          >
            <Text style={[styles.toolText, tool === 'draw' && styles.activeText]}>✏️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolButton, tool === 'eraser' && styles.activeButton]} 
            onPress={() => setTool('eraser')}
          >
            <Text style={[styles.toolText, tool === 'eraser' && styles.activeText]}>🧹</Text>
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

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={undo}>
            <Text style={styles.actionText}>↶</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={redo}>
            <Text style={styles.actionText}>↷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={clearAll}>
            <Text style={[styles.actionText, { color: '#fff' }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Color Picker */}
      {showColorPicker && tool === 'draw' && (
        <View style={styles.colorPicker}>
          <Text style={styles.colorPickerTitle}>Colors</Text>
          <View style={styles.colorGrid}>
            {COLORS.map((colorOption) => (
              <TouchableOpacity
                key={colorOption}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorOption },
                  color === colorOption && styles.selectedColor
                ]}
                onPress={() => {
                  setColor(colorOption)
                  setShowColorPicker(false)
                }}
              />
            ))}
          </View>
        </View>
      )}

      {/* Size Controls */}
      {tool === 'draw' && (
        <View style={styles.sizeContainer}>
          <Text style={styles.sizeLabel}>Brush Size</Text>
          <View style={styles.sizeOptions}>
            {strokeWidths.map(width => (
              <TouchableOpacity 
                key={`stroke-${width}`} 
                style={[styles.sizeButton, strokeWidth === width && styles.activeSizeButton]} 
                onPress={() => setStrokeWidth(width)}
              >
                <View style={{
                  width: Math.min(width * 2, 20),
                  height: Math.min(width * 2, 20),
                  borderRadius: Math.min(width * 2, 20) / 2,
                  backgroundColor: color
                }} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {tool === 'eraser' && (
        <View style={styles.sizeContainer}>
          <Text style={styles.sizeLabel}>Eraser Size</Text>
          <View style={styles.sizeOptions}>
            {eraserSizes.map(size => (
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
        style={styles.exportButton}
        onPress={async () => {
          try {
            if (!viewShotRef.current) return
            const uri = await captureRef(viewShotRef.current, { format: 'png', quality: 1 })
            const { status } = await MediaLibrary.requestPermissionsAsync()
            if (status !== 'granted') {
              alert("Permission to access media library denied")
              return
            }
            const asset = await MediaLibrary.createAssetAsync(uri)
            await MediaLibrary.createAlbumAsync('Whiteboard', asset, false)
            alert("Saved to gallery!")
          } catch (error) {
            console.log('Export error:', error)
          }
        }}
      >
        <Text style={styles.exportButtonText}>💾 Export</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8f9fa' 
  },
  canvas: { 
    flex: 1,
    backgroundColor: '#ffffff',
    margin: 10,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  svg: { 
    flex: 1 
  },
  
  // Zoom Alert
  zoomAlert: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -60 }, { translateY: -20 }],
    zIndex: 1000,
  },
  zoomAlertContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  zoomAlertText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Top Toolbar
  topToolbar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toolContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  toolButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  toolText: {
    fontSize: 20,
  },
  activeText: {
    color: '#fff',
  },
  colorButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  colorButtonText: {
    fontSize: 16,
  },

  // Action Container
  actionContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  // Color Picker
  colorPicker: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  colorPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
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
    transform: [{ scale: 1.1 }],
  },

  // Size Container
  sizeContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
    textAlign: 'center',
  },
  sizeOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  sizeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeSizeButton: {
    borderColor: '#007AFF',
    backgroundColor: '#e8f4f8',
  },
  sizeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },

  // Export Button
  exportButton: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: [{ translateX: -60 }],
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
})
