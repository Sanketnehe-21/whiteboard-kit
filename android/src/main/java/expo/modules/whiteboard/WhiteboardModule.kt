package expo.modules.whiteboard

import android.graphics.Color
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WhiteboardModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WhiteboardCanvasView")

    View(WhiteboardCanvasView::class) {
      Events("onStrokeStart", "onStrokeEnd", "onHistoryChange")

      Prop("strokeColor") { view: WhiteboardCanvasView, color: String ->
        try {
          view.strokeColor = Color.parseColor(color)
        } catch (_: Exception) {}
      }

      Prop("strokeWidth") { view: WhiteboardCanvasView, width: Float ->
        view.strokeWidth = width
      }

      Prop("tool") { view: WhiteboardCanvasView, tool: String ->
        view.tool = tool
      }

      Prop("eraserSize") { view: WhiteboardCanvasView, size: Float ->
        view.eraserSize = size
      }

      Prop("canvasBackgroundColor") { view: WhiteboardCanvasView, color: String ->
        try {
          view.canvasBackgroundColor = Color.parseColor(color)
          view.invalidate()
        } catch (_: Exception) {}
      }

      AsyncFunction("undo") { view: WhiteboardCanvasView ->
        view.post { view.undo() }
      }

      AsyncFunction("redo") { view: WhiteboardCanvasView ->
        view.post { view.redo() }
      }

      AsyncFunction("clear") { view: WhiteboardCanvasView ->
        view.post { view.clear() }
      }

      AsyncFunction("exportToBase64") { view: WhiteboardCanvasView, format: String?, quality: Int? ->
        view.exportToBase64(format ?: "png", quality ?: 100)
      }

      AsyncFunction("exportToFile") { view: WhiteboardCanvasView, filePath: String, format: String?, quality: Int? ->
        view.exportToFile(filePath, format ?: "png", quality ?: 100)
      }
    }
  }
}
