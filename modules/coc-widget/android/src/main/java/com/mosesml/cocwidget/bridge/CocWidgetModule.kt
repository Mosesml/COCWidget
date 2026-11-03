package com.mosesml.cocwidget.bridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject
import android.util.Log
import java.io.File

class CocWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CocWidget")
    AsyncFunction("saveProjection") { json: String ->
      require(json.length <= 500_000) { "Widget projection is too large" }
      val root = JSONObject(json)
      require(root.optInt("version") == 1 && root.optJSONArray("accounts") != null) { "Invalid widget projection" }
      val context = appContext.reactContext ?: throw IllegalStateException("Application is not ready")
      // commit() precedes widget refresh, so a receiver never sees half-written state.
      check(VillageWidgetProvider.preferences(context).edit().putString("projection", json).commit()) { "Could not persist widget data" }
      VillageWidgetProvider.updateAll(context)
    }
    AsyncFunction("reportSyncResult") { json: String ->
      require(json.length <= 2048) { "Sync result is too large" }
      val result = JSONObject(json)
      require(result.optString("requestId").matches(Regex("[A-Za-z0-9_-]{1,80}"))) { "Invalid request ID" }
      val context = appContext.reactContext ?: throw IllegalStateException("Application is not ready")
      check(VillageWidgetProvider.preferences(context).edit().putString("lastSync", json).commit())
      // Only delivery metadata, never the village export or clipboard contents.
      Log.i("CocWidgetSync", json)
    }
    AsyncFunction("readIncomingExport") { requestId: String ->
      require(requestId.matches(Regex("[A-Za-z0-9_-]{1,80}"))) { "Invalid request ID" }
      val context = appContext.reactContext ?: throw IllegalStateException("Application is not ready")
      val directory = context.getExternalFilesDir("imports") ?: throw IllegalStateException("Import storage is unavailable")
      val file = File(directory, "$requestId.json")
      require(file.canonicalFile == File(directory.canonicalFile, "$requestId.json")) { "Import symlinks are not supported" }
      require(file.isFile && file.length() <= 1_000_000) { "Export file is missing or too large" }
      try {
        file.inputStream().use { stream ->
          val output = java.io.ByteArrayOutputStream()
          val buffer = ByteArray(8192)
          while (true) {
            val count = stream.read(buffer)
            if (count < 0) break
            require(output.size() + count <= 1_000_000) { "Export file is too large" }
            output.write(buffer, 0, count)
          }
          Charsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(output.toByteArray())).toString()
        }
      } finally { file.delete() }
    }
    AsyncFunction("moveToBackground") {
      appContext.currentActivity?.let { activity -> activity.runOnUiThread { activity.moveTaskToBack(true) } }
    }
  }
}
