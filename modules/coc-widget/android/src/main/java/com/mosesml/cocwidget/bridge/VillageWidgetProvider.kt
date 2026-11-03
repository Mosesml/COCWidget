package com.mosesml.cocwidget.bridge

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

class VillageWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == REFRESH) updateAll(context)
  }
  override fun onDeleted(context: Context, ids: IntArray) {
    val edit = preferences(context).edit()
    ids.forEach { id ->
      edit.remove("widget:$id:tag")
      (context.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(refreshIntent(context, id))
    }
    edit.apply()
  }
  companion object {
    const val REFRESH = "com.mosesml.cocwidget.WIDGET_BOUNDARY"
    fun preferences(context: Context) = context.getSharedPreferences("cocwidget-native", Context.MODE_PRIVATE)
    fun projection(context: Context): JSONObject = try { JSONObject(preferences(context).getString("projection", "{}") ?: "{}") } catch (_: Exception) { JSONObject() }
    private fun refreshIntent(context: Context, id: Int) = PendingIntent.getBroadcast(context, id,
      Intent(context, VillageWidgetProvider::class.java).setAction(REFRESH).setData(Uri.parse("cocwidget://boundary/$id")), PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      manager.getAppWidgetIds(ComponentName(context, VillageWidgetProvider::class.java)).forEach { update(context, manager, it) }
    }
    fun update(context: Context, manager: AppWidgetManager, id: Int) {
      val root = projection(context)
      val rawAccounts = root.optJSONArray("accounts")
      val accounts = (0 until (rawAccounts?.length() ?: 0)).map { rawAccounts!!.getJSONObject(it) }
      val selectedTag = preferences(context).getString("widget:$id:tag", "all")
      val selected = accounts.find { it.optString("tag") == selectedTag }
      val deletedSelection = selectedTag != "all" && selected == null
      val now = System.currentTimeMillis()
      val view = RemoteViews(context.packageName, R.layout.coc_village_widget)
      val title = if (deletedSelection) "Village removed" else selected?.optString("name") ?: "Your villages"
      view.setTextViewText(R.id.coc_title, title)
      val items = mutableListOf<JSONObject>()
      if (selected != null) {
        val rows = selected.optJSONArray("rows")
        val active = (0 until (rows?.length() ?: 0)).map { rows!!.getJSONObject(it) }.filter { it.optLong("end") > now }.sortedBy { it.optLong("end") }
        val busy = active.count { it.optString("lane") == "builder" && !it.optBoolean("extra") }
        view.setTextViewText(R.id.coc_meta, "TH ${selected.optInt("townHall")} · ${(selected.optInt("builders") - busy).coerceAtLeast(0)} builders expected free" + if (selected.optBoolean("demo")) " · SAMPLE" else "")
        items.addAll(active.take(3))
        val action = selected.optJSONObject("nextAction")
        view.setTextViewText(R.id.coc_next, if (action != null) "Next: ${action.optString("name")} ${action.optString("level")}" else "Import fresh data after changes in-game")
        view.setTextViewText(R.id.coc_freshness, "Exported ${DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(selected.optLong("exportedAt")))} · Estimates")
      } else {
        view.setTextViewText(R.id.coc_meta, if (deletedSelection) "Choose another village in widget settings" else "${accounts.size} saved villages · Estimates")
        if (!deletedSelection) accounts.take(3).forEach { account ->
          val rows = account.optJSONArray("rows")
          val next = (0 until (rows?.length() ?: 0)).map { rows!!.getJSONObject(it) }.filter { it.optLong("end") > now }.minByOrNull { it.optLong("end") }
          items.add(JSONObject().put("name", account.optString("name")).put("level", "TH ${account.optInt("townHall")}")
            .put("end", next?.optLong("end") ?: 0L).put("overviewHint", next?.optString("name") ?: "No running timers"))
        }
        view.setTextViewText(R.id.coc_next, if (accounts.isEmpty()) "Open COCWidget to import a village" else "Each widget keeps its own village selection")
        view.setTextViewText(R.id.coc_freshness, "Based on saved snapshots · Open app for details")
      }
      val rowIds = intArrayOf(R.id.coc_row_one, R.id.coc_row_two, R.id.coc_row_three)
      rowIds.forEachIndexed { index, rowId ->
        val item = items.getOrNull(index)
        view.setViewVisibility(rowId, if (item == null) View.GONE else View.VISIBLE)
        if (item != null) {
          val row = RemoteViews(context.packageName, R.layout.coc_widget_row)
          row.setTextViewText(R.id.coc_row_name, item.optString("name"))
          row.setTextViewText(R.id.coc_row_level, item.optString("overviewHint", item.optString("level")))
          val end = item.optLong("end")
          row.setViewVisibility(R.id.coc_row_timer, if (end > now) View.VISIBLE else View.GONE)
          if (end > now) {
            row.setChronometer(R.id.coc_row_timer, SystemClock.elapsedRealtime() + end - now, null, true)
            row.setChronometerCountDown(R.id.coc_row_timer, true)
          }
          view.removeAllViews(rowId); view.addView(rowId, row)
        }
      }
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      if (launch != null) {
        launch.action = Intent.ACTION_VIEW
        launch.data = if (selected != null) Uri.parse("cocwidget://village?tag=" + Uri.encode(selected.optString("tag"))) else Uri.parse("cocwidget://villages")
        view.setOnClickPendingIntent(R.id.coc_widget_root, PendingIntent.getActivity(context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      manager.updateAppWidget(id, view)
      val next = items.map { it.optLong("end") }.filter { it > now }.minOrNull()
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (next != null) alarm.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + next - now + 1000, refreshIntent(context, id))
      else alarm.cancel(refreshIntent(context, id))
    }
  }
}
