import { useRef, useState } from 'react';

export type Point = { x: number; y: number };
export type Stroke = Point[];

export function useWhiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const currentStroke = useRef<Stroke>([]);

  const startStroke = (point: Point) => {
    currentStroke.current = [point];
    setStrokes((prev) => [...prev, [point]]);
  };

  const addPoint = (point: Point) => {
    currentStroke.current.push(point);
    setStrokes((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = [...currentStroke.current];
      return updated;
    });
  };

  const endStroke = () => {
    currentStroke.current = [];
  };

  return {
    strokes,
    startStroke,
    addPoint,
    endStroke,
  };
}