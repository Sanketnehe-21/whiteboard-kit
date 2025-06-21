// useWhiteboard.ts
import { useRef, useState } from 'react';

export type Point = { x: number; y: number };
export type Stroke = Point[];
export type Tool = 'draw' | 'eraser';

export function useWhiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>('draw');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [eraserSize, setEraserSize] = useState<number>(20);

  const strokeWidths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const eraserSizes = [10, 20, 30, 40, 50];

  const currentStrokeRef = useRef<Stroke>([]);
  const [currentStrokeForRender, setCurrentStrokeForRender] = useState<Stroke>([]);
  
  const eraserStrokeRef = useRef<Stroke>([]);
  const [eraserStrokeForRender, setEraserStrokeForRender] = useState<Stroke>([]);

  const startStroke = (point: Point) => {
    if (tool !== 'draw') return;
    
    currentStrokeRef.current = [point];
    setCurrentStrokeForRender([point]);
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
    
    if (finished.length > 0) {
      setStrokes((prev) => [...prev, finished]);
    }
    setCurrentStrokeForRender([]);
    currentStrokeRef.current = [];
  };

  const startEraserStroke = (point: Point) => {
    if (tool !== 'eraser') return;
    
    eraserStrokeRef.current = [point];
    setEraserStrokeForRender([point]);
  };

  const addEraserPoint = (point: Point) => {
    if (tool !== 'eraser') return;
    
    eraserStrokeRef.current.push(point);
    setEraserStrokeForRender([...eraserStrokeRef.current]);
  };

  const endEraserStroke = () => {
    if (tool !== 'eraser') return;
    
    setEraserStrokeForRender([]);
    eraserStrokeRef.current = [];
  };

  const handleEraser = (point: Point) => {
    const eraserRadius = eraserSize / 2;
    
    setStrokes((prevStrokes) => {
      const newStrokes = [];
      
      prevStrokes.forEach((stroke) => {
        // Find which points to keep and which to erase
        const pointsToKeep = [];
        
        stroke.forEach((p, index) => {
          const distance = Math.hypot(p.x - point.x, p.y - point.y);
          if (distance >= eraserRadius) {
            pointsToKeep.push({ point: p, originalIndex: index });
          }
        });
        
        if (pointsToKeep.length === 0) {
          // All points erased, remove the whole stroke
          return;
        } else if (pointsToKeep.length === stroke.length) {
          // No points erased, keep the whole stroke
          newStrokes.push(stroke);
        } else {
          // Some points erased, split into continuous segments
          const segments = [];
          let currentSegment = [];
          
          pointsToKeep.forEach((item, index) => {
            const { point: p, originalIndex } = item;
            
            // If this point is not consecutive to the previous one, start a new segment
            if (currentSegment.length > 0) {
              const lastOriginalIndex = pointsToKeep[index - 1].originalIndex;
              if (originalIndex !== lastOriginalIndex + 1) {
                // Gap detected, finish current segment and start new one
                if (currentSegment.length > 1) {
                  segments.push([...currentSegment]);
                }
                currentSegment = [p];
              } else {
                currentSegment.push(p);
              }
            } else {
              currentSegment.push(p);
            }
          });
          
          // Add the last segment if it has enough points
          if (currentSegment.length > 1) {
            segments.push(currentSegment);
          }
          
          newStrokes.push(...segments);
        }
      });
      
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

  return {
    strokes,
    currentStroke: currentStrokeForRender,
    eraserStroke: eraserStrokeForRender,
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
    strokeWidths,
    eraserSizes,
  };
}