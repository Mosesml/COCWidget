package com.mosesml.cocwidget.bridge

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView

class WidgetConfigurationActivity : Activity() {
  override fun onCreate(state: Bundle?) {
    super.onCreate(state)
    setResult(RESULT_CANCELED)
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    if (id == AppWidgetManager.INVALID_APPWIDGET_ID) { finish(); return }
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(40, 64, 40, 40)
      setBackgroundColor(Color.parseColor("#F7F8F2"))
    }
    root.addView(TextView(this).apply {
      text = "Choose a village"; textSize = 27f; setTextColor(Color.parseColor("#253322"))
      setPadding(0, 0, 0, 24)
    })
    root.addView(TextView(this).apply {
      text = "This widget keeps its own selection when you switch villages in the app."
      textSize = 15f; setTextColor(Color.parseColor("#607449")); setPadding(0, 0, 0, 30)
    })
    val accounts = VillageWidgetProvider.projection(this).optJSONArray("accounts")
    fun option(name: String, tag: String) {
      root.addView(Button(this).apply {
        text = name; isAllCaps = false; minHeight = 64
        setOnClickListener {
          VillageWidgetProvider.preferences(this@WidgetConfigurationActivity).edit().putString("widget:$id:tag", tag).commit()
          VillageWidgetProvider.update(this@WidgetConfigurationActivity, AppWidgetManager.getInstance(this@WidgetConfigurationActivity), id)
          setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id))
          finish()
        }
      }, LinearLayout.LayoutParams(-1, -2).apply { bottomMargin = 14 })
    }
    if (accounts != null && accounts.length() > 0) {
      option("All villages", "all")
      for (index in 0 until accounts.length()) {
        val account = accounts.getJSONObject(index)
        option(account.optString("name") + " · TH " + account.optInt("townHall"), account.optString("tag"))
      }
    } else {
      root.addView(TextView(this).apply { text = "Open COCWidget and import a village first."; textSize = 17f })
    }
    setContentView(ScrollView(this).apply { addView(root) })
  }
}
