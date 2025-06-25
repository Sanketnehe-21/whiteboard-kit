import React, { useRef, useState } from 'react'
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import ViewShot, { captureRef } from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useWhiteboard, Point } from '../hooks/useWhiteboard'

export const Whiteboard = () => {
  const viewShotRef = useRef(null)
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
  } = useWhiteboard()
  const [indicatorPosition, setIndicatorPosition] = useState<Point | null>(null)

  const scale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)

  const drawGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart((e) => {
      const point = { x: e.x, y: e.y }
      try {
        console.log('Draw start:', point)
        startStroke(point)
        if (tool === 'eraser') setIndicatorPosition(point)
      } catch (err) {
        console.error('Error in start:', err)
      }
    })
    .onUpdate((e) => {
      const point = { x: e.x, y: e.y }
      try {
        addPoint(point)
        if (tool === 'eraser') setIndicatorPosition(point)
      } catch (err) {
        console.error('Error in update:', err)
      }
    })
    .onEnd(() => {
      try {
        endStroke()
        if (tool === 'eraser') setIndicatorPosition(null)
      } catch (err) {
        console.error('Error in end:', err)
      }
    })

  const composed = Gesture.Exclusive(drawGesture)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }))

  const renderPath = (stroke: any, key: number) => {
    if (!stroke || stroke.points.length < 2) return null
    const d = stroke.points.map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    return (
      <Path
        key={key}
        d={d}
        stroke={stroke.tool === 'eraser' ? '#fff' : '#000'}
        strokeWidth={stroke.strokeWidth}
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
              {renderPath(currentStroke, -1)}
              {tool === 'eraser' && indicatorPosition && (
                <Circle
                  cx={indicatorPosition.x}
                  cy={indicatorPosition.y}
                  r={eraserSize / 2}
                  fill="rgba(200,200,200,0.5)"
                  stroke="gray"
                  strokeWidth="1"
                />
              )}
            </Svg>
          </Animated.View>
        </GestureDetector>
      </ViewShot>

      <View style={styles.toolContainer}>
        <TouchableOpacity style={[styles.toolButton, tool === 'draw' && styles.activeButton]} onPress={() => setTool('draw')}>
          <Text style={[styles.toolText, tool === 'draw' && styles.activeText]}>Draw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolButton, tool === 'eraser' && styles.activeButton]} onPress={() => setTool('eraser')}>
          <Text style={[styles.toolText, tool === 'eraser' && styles.activeText]}>Eraser</Text>
        </TouchableOpacity>
      </View>

      {tool === 'draw' && (
        <View style={styles.sizeContainer}>
          <Text style={styles.sizeLabel}>Stroke:</Text>
          {strokeWidths.map(width => (
            <TouchableOpacity key={`stroke-${width}`} style={[styles.sizeButton, strokeWidth === width && styles.activeSizeButton]} onPress={() => setStrokeWidth(width)}>
              <View style={{ width: width + 4, height: width + 4, borderRadius: (width + 4) / 2, backgroundColor: 'black' }} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tool === 'eraser' && (
        <View style={[styles.sizeContainer, { top: 180 }]}>
          <Text style={styles.sizeLabel}>Eraser:</Text>
          {eraserSizes.map(size => (
            <TouchableOpacity key={`eraser-${size}`} style={[styles.sizeButton, eraserSize === size && styles.activeSizeButton]} onPress={() => setEraserSize(size)}>
              <Text style={styles.sizeButtonText}>{size}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={undo}>
          <Text style={styles.actionText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={redo}>
          <Text style={styles.actionText}>Redo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.clearButton]} onPress={clearAll}>
          <Text style={styles.actionText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: '#007AFF', position: 'absolute', bottom: 100, left: '50%', transform: [{ translateX: -75 }] }]}
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
          } catch (error) {
            console.log('Export error:', error)
          }
        }}
      >
        <Text style={styles.actionText}>Export PNG</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  canvas: { flex: 1 },
  svg: { flex: 1 },
  toolContainer: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: [{ translateX: -85 }],
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 12,
  },
  toolButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  activeButton: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  toolText: { fontSize: 16, fontWeight: '600', color: '#333' },
  activeText: { color: '#fff' },
  sizeContainer: {
    position: 'absolute',
    top: 110,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 8,
    gap: 10,
  },
  sizeLabel: { fontSize: 14, fontWeight: '600', marginRight: 5 },
  sizeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeSizeButton: { borderColor: '#007AFF' },
  sizeButtonText: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: [{ translateX: -125 }],
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  clearButton: { backgroundColor: '#FF3B30', borderColor: '#FF3B30' },
  actionText: { fontSize: 16, fontWeight: '600', color: '#333' },
})
