import React, { useRef } from 'react';
import { View, PanResponder, TouchableOpacity, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useWhiteboard } from '../hooks/useWhiteboard';

export const Whiteboard = () => {
  const {
    strokes,
    currentStroke,
    startStroke,
    addPoint,
    endStroke,
    undo,
    redo,
    tool,
    setTool,
    onTouchPoint,
    setStrokes, // Add this for testing
  } = useWhiteboard();

  const [eraserPosition, setEraserPosition] = React.useState(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Try both locationX/Y and pageX/Y for better coordinate handling
        const point = {
          x: evt.nativeEvent.locationX || evt.nativeEvent.pageX,
          y: evt.nativeEvent.locationY || evt.nativeEvent.pageY
        };

        console.log(`Tool: ${tool}, Grant Point:`, point, 'Strokes count:', strokes.length);

        if (tool === 'draw') {
          startStroke(point);
        } else if (tool === 'eraser') {
          setEraserPosition(point);
          onTouchPoint(point);
        }
      },
      onPanResponderMove: (evt) => {
        const point = {
          x: evt.nativeEvent.locationX || evt.nativeEvent.pageX,
          y: evt.nativeEvent.locationY || evt.nativeEvent.pageY
        };

        if (tool === 'draw') {
          addPoint(point);
        } else if (tool === 'eraser') {
          setEraserPosition(point);
          onTouchPoint(point);
        }
      },
      onPanResponderRelease: () => {
        if (tool === 'draw') {
          endStroke();
        } else if (tool === 'eraser') {
          setEraserPosition(null);
        }
      },
    })
  ).current;

  const renderPath = (stroke, index) => {
    if (stroke.length < 2) return null;
    const d = stroke.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return <Path key={index} d={d} stroke="black" strokeWidth={2} fill="none" />;
  };

  return (
    <View style={styles.container}>
      <View {...panResponder.panHandlers} style={styles.canvas}>
        <Svg style={styles.svg}>
          {strokes.map(renderPath)}
          {renderPath(currentStroke, -1)}
          
          {/* Eraser indicator */}
          {tool === 'eraser' && eraserPosition && (
            <Circle
              cx={eraserPosition.x}
              cy={eraserPosition.y}
              r="40"
              fill="rgba(255,0,0,0.2)"
              stroke="red"
              strokeWidth="2"
            />
          )}
        </Svg>
      </View>

      {/* Tool Switcher with better styling */}
      <View style={styles.toolContainer}>
        <TouchableOpacity
          style={[styles.toolButton, tool === 'draw' && styles.activeButton]}
          onPress={() => {
            console.log('Draw button pressed'); // Debug log
            setTool('draw');
          }}
        >
          <Text style={[styles.toolText, tool === 'draw' && styles.activeText]}>
            Draw
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolButton, tool === 'eraser' && styles.activeButton]}
          onPress={() => {
            console.log('Eraser button pressed'); // Debug log
            setTool('eraser');
          }}
        >
          <Text style={[styles.toolText, tool === 'eraser' && styles.activeText]}>
            Eraser
          </Text>
        </TouchableOpacity>
      </View>

      {/* Undo / Redo with better styling */}
      <View style={styles.actionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={undo}>
          <Text style={styles.actionText}>Undo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={redo}>
          <Text style={styles.actionText}>Redo</Text>
        </TouchableOpacity>
      </View>

      {/* Test buttons */}
      <View style={styles.testContainer}>
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => {
            // Add a test stroke for debugging
            const testStroke = [
              { x: 100, y: 100 },
              { x: 150, y: 100 },
              { x: 200, y: 100 }
            ];
            console.log('Adding test stroke:', testStroke);
            setStrokes(prev => [...prev, testStroke]);
          }}
        >
          <Text style={styles.testText}>Add Test Stroke</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => {
            console.log('Manual erase test at (150, 100)');
            onTouchPoint({ x: 150, y: 100 });
          }}
        >
          <Text style={styles.testText}>Test Erase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton} 
          onPress={() => {
            console.log('Clearing all strokes');
            setStrokes([]);
          }}
        >
          <Text style={styles.testText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Current tool indicator */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>Current tool: {tool}</Text>
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
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  testContainer: {
    position: 'absolute',
    top: 200,
    left: 20,
    flexDirection: 'column',
    gap: 10,
  },
  testButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FF6B6B',
    borderRadius: 6,
  },
  testText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    position: 'absolute',
    top: 120,
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