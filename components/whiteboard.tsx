import React, { useRef, useState } from 'react';
import { View, PanResponder, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useWhiteboard, Point } from '../hooks/useWhiteboard'; 
import { exportAsSVG } from './../utils/exportAsSvg';

export const Whiteboard = () => {
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
    eraserSizes,
    strokeWidths,
  } = useWhiteboard();

  // --- This state is now only for the visual indicator ---
  const [indicatorPosition, setIndicatorPosition] = useState<Point | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = { x: locationX, y: locationY };

        // --- SIMPLIFIED: Start a stroke and show the indicator ---
        startStroke(point);
        if (tool === 'eraser') {
          setIndicatorPosition(point);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const point = { x: locationX, y: locationY };
        
        // --- SIMPLIFIED: Add a point and move the indicator ---
        addPoint(point);
        if (tool === 'eraser') {
          setIndicatorPosition(point);
        }
      },
      onPanResponderRelease: () => {
        // --- SIMPLIFIED: End the stroke and hide the indicator ---
        endStroke();
        setIndicatorPosition(null);
      },
    })
  ).current;

  // --- UPDATED: renderPath now accepts a Stroke object ---
  const renderPath = (stroke: any, key: number) => {
    if (!stroke || stroke.points.length < 2) return null;
    
    const d = stroke.points.map((p: Point, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    return (
      <Path
        key={key}
        d={d}
        stroke={stroke.tool === 'eraser' ? "#fff" : "#000"} // Use white for eraser
        strokeWidth={stroke.strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };

  return (
    <View style={styles.container}>
      <View {...panResponder.panHandlers} style={styles.canvas}>
        <Svg style={styles.svg}>
          {/* Render committed strokes */}
          {strokes.map((stroke, index) => renderPath(stroke, index))}
          
          {/* Render the stroke currently being drawn */}
          {renderPath(currentStroke, -1)}

          {/* Eraser indicator */}
          {tool === 'eraser' && indicatorPosition && (
            <Circle
              cx={indicatorPosition.x}
              cy={indicatorPosition.y}
              r={eraserSize / 2}
              fill="rgba(200, 200, 200, 0.5)"
              stroke="gray"
              strokeWidth="1"
            />
          )}
        </Svg>
      </View>

      {/* --- UI Controls (Largely unchanged, but Clear button is fixed) --- */}
      <View style={styles.toolContainer}>
        {/* ... (rest of your UI is mostly fine) ... */}
        <TouchableOpacity
          style={[styles.toolButton, tool === 'draw' && styles.activeButton]}
          onPress={() => setTool('draw')}
        >
          <Text style={[styles.toolText, tool === 'draw' && styles.activeText]}>Draw</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolButton, tool === 'eraser' && styles.activeButton]}
          onPress={() => setTool('eraser')}
        >
          <Text style={[styles.toolText, tool === 'eraser' && styles.activeText]}>Eraser</Text>
        </TouchableOpacity>
      </View>

      {tool === 'draw' && (
        <View style={styles.sizeContainer}>
            <Text style={styles.sizeLabel}>Stroke:</Text>
            {strokeWidths.map(width => (
                <TouchableOpacity
                key={`stroke-${width}`}
                style={[styles.sizeButton, strokeWidth === width && styles.activeSizeButton]}
                onPress={() => setStrokeWidth(width)}
                >
                <View style={{width: width + 4, height: width + 4, borderRadius: (width + 4)/2, backgroundColor: 'black'}}/>
                </TouchableOpacity>
            ))}
        </View>
      )}

      {tool === 'eraser' && (
        <View style={[styles.sizeContainer, {top: 180}]}>
            <Text style={styles.sizeLabel}>Eraser:</Text>
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
      )}

      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={undo}>
          <Text style={styles.actionText}>Undo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={redo}>
          <Text style={styles.actionText}>Redo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.clearButton]}
          onPress={clearAll} // Use the new clearAll function
        >
          <Text style={styles.actionText}>Clear All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};


// --- Minor style adjustments for better usability ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  canvas: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
  toolContainer: {
    position: 'absolute',
    top: 50,
    left: '50%',
    transform: [{ translateX: -85 }], // Center the container
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 8,
    borderRadius: 12,
  },
  toolButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  activeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  toolText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  activeText: {
    color: '#fff',
  },
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
  sizeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 5,
  },
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
  activeSizeButton: {
    borderColor: '#007AFF',
  },
  sizeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333'
  },
  actionContainer: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: [{ translateX: -125 }], // Center it
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc'
  },
  clearButton: {
    backgroundColor: '#FF3B30',
    borderColor: '#FF3B30'
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
});