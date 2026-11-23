package expo.modules.whiteboard

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.util.Base64
import android.view.MotionEvent
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream

data class Stroke(
  val path: Path,
  val color: Int,
  val strokeWidth: Float,
  val isEraser: Boolean
)

class WhiteboardCanvasView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {

  private var offscreenBitmap: Bitmap? = null
  private var offscreenCanvas: Canvas? = null

  private val strokes = mutableListOf<Stroke>()
  private val redoStack = mutableListOf<Stroke>()

  private val currentPath = Path()
  private val currentPaint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
    style = Paint.Style.STROKE
    strokeJoin = Paint.Join.ROUND
    strokeCap = Paint.Cap.ROUND
  }

  private var mLastX = 0f
  private var mLastY = 0f

  // Configurable properties
  var strokeColor: Int = Color.BLACK
  var strokeWidth: Float = 6f
  var tool: String = "draw" // "draw" or "eraser"
  var eraserSize: Float = 40f
  var canvasBackgroundColor: Int = Color.WHITE

  // Expo Event Dispatchers
  val onStrokeStart by EventDispatcher()
  val onStrokeEnd by EventDispatcher()
  val onHistoryChange by EventDispatcher()

  init {
    setWillNotDraw(false)
    setLayerType(LAYER_TYPE_HARDWARE, null)
  }

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    super.onSizeChanged(w, h, oldw, oldh)
    if (w <= 0 || h <= 0) return

    val oldBitmap = offscreenBitmap
    val newBitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val newCanvas = Canvas(newBitmap)

    // Replay existing strokes onto new bitmap
    if (strokes.isNotEmpty()) {
      for (stroke in strokes) {
        val paint = createPaint(stroke.color, stroke.strokeWidth, stroke.isEraser)
        newCanvas.drawPath(stroke.path, paint)
      }
    }

    offscreenBitmap = newBitmap
    offscreenCanvas = newCanvas
    oldBitmap?.recycle()
  }

  override fun onDraw(canvas: Canvas) {
    super.onDraw(canvas)

    // 1. Draw canvas background
    canvas.drawColor(canvasBackgroundColor)

    // 2. Draw all finalized strokes from offscreen buffer
    offscreenBitmap?.let {
      canvas.drawBitmap(it, 0f, 0f, null)
    }

    // 3. Draw active stroke in real-time
    if (!currentPath.isEmpty) {
      canvas.drawPath(currentPath, currentPaint)
    }
  }

  override fun onTouchEvent(event: MotionEvent): Boolean {
    val x = event.x
    val y = event.y

    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        parent?.requestDisallowInterceptTouchEvent(true)
        val isEraser = tool == "eraser"

        if (isEraser) {
          currentPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
          currentPaint.color = Color.TRANSPARENT
          currentPaint.strokeWidth = eraserSize
        } else {
          currentPaint.xfermode = null
          currentPaint.color = strokeColor
          currentPaint.strokeWidth = strokeWidth
        }

        currentPath.reset()
        currentPath.moveTo(x, y)
        mLastX = x
        mLastY = y

        onStrokeStart(emptyMap())
        invalidate()
        return true
      }

      MotionEvent.ACTION_MOVE -> {
        // High-frequency historical touch processing for ultra-smooth Bezier curves
        val historySize = event.historySize
        for (i in 0 until historySize) {
          val hx = event.getHistoricalX(i)
          val hy = event.getHistoricalY(i)
          val midX = (mLastX + hx) / 2f
          val midY = (mLastY + hy) / 2f
          currentPath.quadTo(mLastX, mLastY, midX, midY)
          mLastX = hx
          mLastY = hy
        }

        val midX = (mLastX + x) / 2f
        val midY = (mLastY + y) / 2f
        currentPath.quadTo(mLastX, mLastY, midX, midY)
        mLastX = x
        mLastY = y

        invalidate()
        return true
      }

      MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
        currentPath.lineTo(mLastX, mLastY)

        val isEraser = tool == "eraser"
        val paint = createPaint(
          if (isEraser) Color.TRANSPARENT else strokeColor,
          if (isEraser) eraserSize else strokeWidth,
          isEraser
        )

        // Bake stroke into offscreen buffer
        offscreenCanvas?.drawPath(currentPath, paint)

        // Save into history
        strokes.add(
          Stroke(
            path = Path(currentPath),
            color = if (isEraser) Color.TRANSPARENT else strokeColor,
            strokeWidth = if (isEraser) eraserSize else strokeWidth,
            isEraser = isEraser
          )
        )
        redoStack.clear()

        currentPath.reset()
        parent?.requestDisallowInterceptTouchEvent(false)

        onStrokeEnd(emptyMap())
        notifyHistoryChange()
        invalidate()
        return true
      }
    }
    return super.onTouchEvent(event)
  }

  private fun createPaint(color: Int, width: Float, isEraser: Boolean): Paint {
    return Paint(Paint.ANTI_ALIAS_FLAG or Paint.DITHER_FLAG).apply {
      style = Paint.Style.STROKE
      strokeJoin = Paint.Join.ROUND
      strokeCap = Paint.Cap.ROUND
      strokeWidth = width
      if (isEraser) {
        xfermode = PorterDuffXfermode(PorterDuff.Mode.CLEAR)
        this.color = Color.TRANSPARENT
      } else {
        xfermode = null
        this.color = color
      }
    }
  }

  fun undo() {
    if (strokes.isEmpty()) return
    val last = strokes.removeAt(strokes.size - 1)
    redoStack.add(last)
    redrawAllStrokes()
  }

  fun redo() {
    if (redoStack.isEmpty()) return
    val restored = redoStack.removeAt(redoStack.size - 1)
    strokes.add(restored)
    redrawAllStrokes()
  }

  fun clear() {
    if (strokes.isEmpty()) return
    strokes.clear()
    redoStack.clear()
    redrawAllStrokes()
  }

  private fun redrawAllStrokes() {
    offscreenBitmap?.eraseColor(Color.TRANSPARENT)
    offscreenCanvas?.let { canvas ->
      for (stroke in strokes) {
        val paint = createPaint(stroke.color, stroke.strokeWidth, stroke.isEraser)
        canvas.drawPath(stroke.path, paint)
      }
    }
    notifyHistoryChange()
    invalidate()
  }

  private fun notifyHistoryChange() {
    onHistoryChange(
      mapOf(
        "canUndo" to strokes.isNotEmpty(),
        "canRedo" to redoStack.isNotEmpty(),
        "strokeCount" to strokes.size
      )
    )
  }

  fun getCompositeBitmap(includeBackground: Boolean = true): Bitmap {
    val w = width.coerceAtLeast(1)
    val h = height.coerceAtLeast(1)
    val result = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(result)

    if (includeBackground) {
      canvas.drawColor(canvasBackgroundColor)
    }

    offscreenBitmap?.let {
      canvas.drawBitmap(it, 0f, 0f, null)
    }

    return result
  }

  fun exportToBase64(format: String = "png", quality: Int = 100): String {
    val bitmap = getCompositeBitmap(includeBackground = format.lowercase() != "png_transparent")
    val stream = ByteArrayOutputStream()
    val compressFormat = if (format.lowercase().contains("jp")) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
    bitmap.compress(compressFormat, quality.coerceIn(1, 100), stream)
    val bytes = stream.toByteArray()
    return Base64.encodeToString(bytes, Base64.NO_WRAP)
  }

  fun exportToFile(filePath: String, format: String = "png", quality: Int = 100): Boolean {
    val bitmap = getCompositeBitmap(includeBackground = format.lowercase() != "png_transparent")
    val file = File(filePath)
    file.parentFile?.mkdirs()
    FileOutputStream(file).use { out ->
      val compressFormat = if (format.lowercase().contains("jp")) Bitmap.CompressFormat.JPEG else Bitmap.CompressFormat.PNG
      return bitmap.compress(compressFormat, quality.coerceIn(1, 100), out)
    }
  }
}
