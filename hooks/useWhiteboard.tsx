import { useRef, useState } from 'react';

export type Point = { x: number; y: number };
export type Stroke = Point[];
export type Tool = 'draw' | 'eraser';

export function useWhiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('draw');

  const currentStrokeRef = useRef<Stroke>([]);
  const [currentStrokeForRender, setCurrentStrokeForRender] = useState<Stroke>([]);

  const startStroke = (point: Point) => {
    if (tool !== 'draw') return;
    
    console.log('Starting stroke with point:', point); // Debug log
    currentStrokeRef.current = [point];
    setCurrentStrokeForRender([point]);
    // Clear redo stack when starting a new stroke
    setRedoStack([]);
  };

  const addPoint = (point: Point) => {
    if (tool !== 'draw') return;
    
    currentStrokeRef.current.push(point);
    setCurrentStrokeForRender([...currentStrokeRef.current]);
  };

  const endStroke = () => {
    if (tool !== 'draw') return;
    
    const finished = [...currentStrokeRef.current];
    console.log('Ending stroke with', finished.length, 'points'); // Debug log
    
    if (finished.length > 0) {
      setStrokes((prev) => [...prev, finished]);
    }
    setCurrentStrokeForRender([]);
    currentStrokeRef.current = [];
  };

  const handleEraser = (point: Point) => {
    console.log('=== ERASER DEBUG ===');
    console.log('Erasing at point:', point);
    console.log('Current strokes count:', strokes.length);
    
    // Log all stroke points for debugging
    strokes.forEach((stroke, index) => {
      console.log(`Stroke ${index} has ${stroke.length} points:`, stroke.slice(0, 3));
    });
    
    const eraserRadius = 50; // Even larger radius for testing
    
    setStrokes((prev) => {
      console.log('Processing', prev.length, 'strokes for erasing');
      
      const newStrokes = prev.filter((stroke, strokeIndex) => {
        // Check if any point in the stroke is within eraser radius
        let closestDistance = Infinity;
        const isErased = stroke.some((p, pointIndex) => {
          const distance = Math.hypot(p.x - point.x, p.y - point.y);
          if (distance < closestDistance) {
            closestDistance = distance;
          }
          const withinRadius = distance < eraserRadius;
          
          if (pointIndex < 3) { // Log first few points
            console.log(`Stroke ${strokeIndex}, Point ${pointIndex}: (${p.x}, ${p.y}) - Distance: ${distance}, Within radius: ${withinRadius}`);
          }
          
          return withinRadius;
        });
        
        console.log(`Stroke ${strokeIndex}: Closest distance: ${closestDistance}, Will be erased: ${isErased}`);
        
        return !isErased;
      });
      
      console.log(`Eraser result: ${prev.length} -> ${newStrokes.length} strokes`);
      console.log('===================');
      
      return newStrokes;
    });
    
    // Clear redo stack when erasing
    setRedoStack([]);
  };

  const onTouchPoint = (point: Point) => {
    if (tool === 'eraser') {
      handleEraser(point);
    }
  };

  const undo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const popped = prev[prev.length - 1];
      setRedoStack((r) => [...r, popped]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const popped = prev[prev.length - 1];
      setStrokes((s) => [...s, popped]);
      return prev.slice(0, -1);
    });
  };

  const setToolWrapper = (newTool: Tool) => {
    console.log('Setting tool to:', newTool); // Debug log
    setTool(newTool);
  };

  return {
    strokes,
    currentStroke: currentStrokeForRender,
    startStroke,
    addPoint,
    endStroke,
    undo,
    redo,
    tool,
    setTool: setToolWrapper,
    onTouchPoint,
    setStrokes, // Export for testing
  };
}