// Whiteboard.js
import React, { useRef } from 'react';
import { View, PanResponder, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useWhiteboard } from '../hooks/useWhiteboard';

export const Whiteboard = () => {
  const {
    strokes,
    currentStroke,
    eraserStroke,
    startStroke,
    addPoint,
    endStroke,
    startEraserStroke,
    addEraserPoint,
    endEraserStroke,
    undo,
    redo,
    tool,
    setTool,
    onTouchPoint,
    setStrokes,
    strokeWidth,
    setStrokeWidth,
    eraserSize,
    setEraserSize,
    eraserSizes,
    strokeWidths,
  } = useWhiteboard();

  const [eraserPosition, setEraserPosition] = React.useState(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
        
        const point = {
          x: locationX !== undefined ? locationX : pageX,
          y: locationY !== undefined ? locationY : pageY
        };

        if (tool === 'draw') {
          startStroke(point);
        } else if (tool === 'eraser') {
          setEraserPosition(point);
          startEraserStroke(point);
        }
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY, pageX, pageY } = evt.nativeEvent;
        const point = {
          x: locationX !== undefined ? locationX : pageX,
          y: locationY !== undefined ? locationY : pageY
        };

        if (tool === 'draw') {
          addPoint(point);
        } else if (tool === 'eraser') {
          setEraserPosition(point);
          addEraserPoint(point);
          onTouchPoint(point);
        }
      },
      onPanResponderRelease: () => {
        if (tool === 'draw') {
          endStroke();
        } else if (tool === 'eraser') {
          setEraserPosition(null);
          endEraserStroke();
        }
      },
    })
  ).current;

  const renderPath = (stroke, index, isEraser = false) => {
    if (stroke.length < 2) return null;
    const d = stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <Path 
        key={index} 
        d={d} 
        stroke={isEraser ? "white" : "black"} 
        strokeWidth={isEraser ? eraserSize : strokeWidth} 
        fill="none" 
      />
    );
  };

  return (
    <View style={styles.container}>
      <View {...panResponder.panHandlers} style={styles.canvas}>
        <Svg style={styles.svg}>
          {strokes.map((stroke, index) => renderPath(stroke, index, false))}
          {renderPath(currentStroke, -1, false)}
          {renderPath(eraserStroke, -2, true)}
          
          {/* Eraser indicator */}
          {tool === 'eraser' && eraserPosition && (
            <Circle
              cx={eraserPosition.x}
              cy={eraserPosition.y}
              r={eraserSize / 2}
              fill="rgba(255,255,255,0.8)"
              stroke="gray"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </Svg>
      </View>

      {/* Tool Switcher */}
      <View style={styles.toolContainer}>
        <TouchableOpacity
          style={[styles.toolButton, tool === 'draw' && styles.activeButton]}
          onPress={() => setTool('draw')}
        >
          <Text style={[styles.toolText, tool === 'draw' && styles.activeText]}>
            Draw
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolButton, tool === 'eraser' && styles.activeButton]}
          onPress={() => setTool('eraser')}
        >
          <Text style={[styles.toolText, tool === 'eraser' && styles.activeText]}>
            Eraser
          </Text>
        </TouchableOpacity>
      </View>

      {/* Stroke Width Selector */}
      <View style={styles.sizeContainer}>
        <Text style={styles.sizeLabel}>Stroke:</Text>
        {strokeWidths.map(width => (
          <TouchableOpacity
            key={`stroke-${width}`}
            style={[
              styles.sizeButton, 
              strokeWidth === width && styles.activeSizeButton
            ]}
            onPress={() => setStrokeWidth(width)}
          >
            <Text style={styles.sizeButtonText}>{width}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Eraser Size Selector */}
      <View style={styles.sizeContainer}>
        <Text style={styles.sizeLabel}>Eraser:</Text>
        {eraserSizes.map(size => (
          <TouchableOpacity
            key={`eraser-${size}`}
            style={[
              styles.sizeButton, 
              eraserSize === size && styles.activeSizeButton
            ]}
            onPress={() => setEraserSize(size)}
          >
            <Text style={styles.sizeButtonText}>{size}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Undo / Redo / Clear */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={undo}>
          <Text style={styles.actionText}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={redo}>
          <Text style={styles.actionText}>Redo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.clearButton]} 
          onPress={() => setStrokes([])}
        >
          <Text style={styles.actionText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Current tool indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {tool === 'draw' 
            ? `Drawing: ${strokeWidth}px` 
            : `Eraser: ${eraserSize}px`}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fff',
  },
  svg: {
    flex: 1,
  },
  toolContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    gap: 10,
  },
  toolButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 2,
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
    top: 120,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 8,
    borderRadius: 8,
    gap: 5,
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
  },
  activeSizeButton: {
    backgroundColor: '#007AFF',
  },
  sizeButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#34C759',
    borderRadius: 8,
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusContainer: {
    position: 'absolute',
    top: 180,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
  },
});