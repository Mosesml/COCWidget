package com.mosesml.cocwidget.bridge

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

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
  }
}
