// hooks/useWhiteboard.ts
import { useRef, useState, useCallback } from 'react';

export type Point = { x: number; y: number };
export type Tool = 'draw' | 'eraser';

export type Stroke = {
  points: Point[];
  tool: Tool;
  strokeWidth: number;
};

export function useWhiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[]>([]);
  
  // State for UI re-rendering
  const [tool, _setTool] = useState<Tool>('draw');
  const [strokeWidth, _setStrokeWidth] = useState<number>(3);
  const [eraserSize, _setEraserSize] = useState<number>(20);

  // --- FIX: Use refs to hold the LATEST values, preventing stale closures ---
  const toolRef = useRef(tool);
  const strokeWidthRef = useRef(strokeWidth);
  const eraserSizeRef = useRef(eraserSize);

  const strokeWidths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const eraserSizes = [10, 20, 30, 40, 50];

  const currentStrokeRef = useRef<Stroke | null>(null);
  const [currentStrokeForRender, setCurrentStrokeForRender] = useState<Stroke | null>(null);

  const setTool = useCallback((newTool: Tool) => {
    toolRef.current = newTool;
    _setTool(newTool);
  }, []);

  const setStrokeWidth = useCallback((newWidth: number) => {
    strokeWidthRef.current = newWidth;
    _setStrokeWidth(newWidth);
  }, []);

  const setEraserSize = useCallback((newSize: number) => {
    eraserSizeRef.current = newSize;
    _setEraserSize(newSize);
  }, []);

  const startStroke = useCallback((point: Point) => {
    const currentTool = toolRef.current;
    
    const newStroke: Stroke = {
      points: [point],
      tool: currentTool,
      strokeWidth: currentTool === 'draw' ? strokeWidthRef.current : eraserSizeRef.current,
    };
    currentStrokeRef.current = newStroke;
    setCurrentStrokeForRender(newStroke);
    setRedoStack([]);
  }, []);

  const addPoint = useCallback((point: Point) => {
    if (!currentStrokeRef.current) return;

    currentStrokeRef.current.points.push(point);
    setCurrentStrokeForRender({ ...currentStrokeRef.current });
  }, []);

  const endStroke = useCallback(() => {
    if (!currentStrokeRef.current) return;

    const finishedStroke = currentStrokeRef.current;
    if (finishedStroke.points.length > 1) {
      setStrokes((prevStrokes) => [...prevStrokes, finishedStroke]);
    }

    currentStrokeRef.current = null;
    setCurrentStrokeForRender(null);
  }, []);

  const undo = () => {
    if (strokes.length === 0) return;
    
    const lastStroke = strokes[strokes.length - 1];
    setRedoStack((prev) => [...prev, lastStroke]);
    setStrokes((prev) => prev.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;

    const strokeToRedo = redoStack[redoStack.length - 1];
    setStrokes((prev) => [...prev, strokeToRedo]);
    setRedoStack((prev) => prev.slice(0, -1));
  };
  
  const clearAll = () => {
      setStrokes([]);
      setRedoStack([]);
  };

  return {
    strokes,
    currentStroke: currentStrokeForRender,
    startStroke,
    addPoint,
    endStroke,
    undo,
    redo,
    clearAll,
    tool, // Return the state for UI updates
    setTool, // Return the new setter
    strokeWidth,
    setStrokeWidth,
    eraserSize,
    setEraserSize,
    strokeWidths,
    eraserSizes,
  };
}