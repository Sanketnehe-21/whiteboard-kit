import { useRef, useState, useCallback } from 'react'

export type Point = { x: number; y: number }
export type Tool = 'draw' | 'eraser'
export type Stroke = { points: Point[]; tool: Tool; strokeWidth: number }

export function useWhiteboard() {
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [tool, _setTool] = useState<Tool>('draw')
  const [strokeWidth, _setStrokeWidth] = useState<number>(3)
  const [eraserSize, _setEraserSize] = useState<number>(20)
  const strokeWidths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const eraserSizes = [10, 20, 30, 40, 50]

  const toolRef = useRef(tool)
  const strokeWidthRef = useRef(strokeWidth)
  const eraserSizeRef = useRef(eraserSize)
  const currentStrokeRef = useRef<Stroke | null>(null)
  const [currentStrokeForRender, setCurrentStrokeForRender] = useState<Stroke | null>(null)

  const setTool = useCallback((val: Tool) => {
    toolRef.current = val
    _setTool(val)
  }, [])

  const setStrokeWidth = useCallback((val: number) => {
    strokeWidthRef.current = val
    _setStrokeWidth(val)
  }, [])

  const setEraserSize = useCallback((val: number) => {
    eraserSizeRef.current = val
    _setEraserSize(val)
  }, [])

  const startStroke = useCallback((point: Point) => {
    const newStroke: Stroke = {
      points: [point],
      tool: toolRef.current,
      strokeWidth: toolRef.current === 'draw' ? strokeWidthRef.current : eraserSizeRef.current,
    }
    currentStrokeRef.current = newStroke
    setCurrentStrokeForRender(newStroke)
    setRedoStack([])
  }, [])

  const addPoint = useCallback((point: Point) => {
    if (!currentStrokeRef.current) return
    currentStrokeRef.current.points.push(point)
    setCurrentStrokeForRender({ ...currentStrokeRef.current })
  }, [])

  const endStroke = useCallback(() => {
    if (!currentStrokeRef.current) return
    if (currentStrokeRef.current.points.length > 1) {
      setStrokes((prev) => [...prev, currentStrokeRef.current!])
    }
    currentStrokeRef.current = null
    setCurrentStrokeForRender(null)
  }, [])

  const undo = () => {
    if (!strokes.length) return
    setRedoStack((prev) => [...prev, strokes[strokes.length - 1]])
    setStrokes((prev) => prev.slice(0, -1))
  }

  const redo = () => {
    if (!redoStack.length) return
    setStrokes((prev) => [...prev, redoStack[redoStack.length - 1]])
    setRedoStack((prev) => prev.slice(0, -1))
  }

  const clearAll = () => {
    setStrokes([])
    setRedoStack([])
  }

  return {
    strokes,
    currentStroke: currentStrokeForRender,
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
  }
}
