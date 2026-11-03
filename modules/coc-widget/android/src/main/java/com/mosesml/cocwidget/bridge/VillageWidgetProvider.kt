package com.mosesml.cocwidget.bridge

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.DateFormat
import java.util.Date

class VillageWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { ids.forEach { update(context, manager, it) } }
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) { update(context, manager, id) }
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
      val options = manager.getAppWidgetOptions(id)
      fun render(height: Int, width: Int): Pair<RemoteViews, Long?> {
        val scale = context.resources.configuration.fontScale.coerceAtLeast(1f)
        val narrow = width < 260 || scale >= 1.4f
        val compact = height / scale < 175
        val showFooter = height / scale >= 125
        val showNext = height / scale >= 245
        val rowHeight = (if (narrow) 67 else 48) * scale
        val fixedHeight = 32 + 27 * scale + (if (compact) 0f else 29 * scale) + (if (showFooter) 24 * scale else 0f) + (if (showNext) 32 * scale else 0f)
        val rowLimit = ((height - fixedHeight) / rowHeight).toInt().coerceIn(1, 3)
        val view = RemoteViews(context.packageName, R.layout.coc_village_widget)
        view.setViewVisibility(R.id.coc_next, if (showNext) View.VISIBLE else View.GONE)
        view.setViewVisibility(R.id.coc_meta, if (compact) View.GONE else View.VISIBLE)
        view.setViewVisibility(R.id.coc_rule, if (compact) View.GONE else View.VISIBLE)
        view.setViewVisibility(R.id.coc_freshness, if (showFooter) View.VISIBLE else View.GONE)
        view.setInt(R.id.coc_next, "setMaxLines", 1)
        val title = if (deletedSelection) "Village removed" else selected?.optString("name") ?: "Your villages"
        view.setTextViewText(R.id.coc_title, title)
        val items = mutableListOf<JSONObject>()
        if (selected != null) {
          val rows = selected.optJSONArray("rows")
          val active = (0 until (rows?.length() ?: 0)).map { rows!!.getJSONObject(it) }.filter { it.optLong("end") > now }.sortedBy { it.optLong("end") }
          val busy = active.count { it.optString("lane") == "builder" && !it.optBoolean("extra") }
          view.setTextViewText(R.id.coc_meta, "TH ${selected.optInt("townHall")} · ${(selected.optInt("builders") - busy).coerceAtLeast(0)} / ${selected.optInt("builders")} builders free*" + if (selected.optBoolean("demo")) " · SAMPLE" else "")
          items.addAll(active.take(rowLimit))
          val action = selected.optJSONObject("nextAction")
          view.setTextViewText(R.id.coc_next, if (action != null) "Next: ${action.optString("name")} ${action.optString("level")}" else "Import fresh data after changes in-game")
          val stale = now - selected.optLong("exportedAt") > 86_400_000
          view.setTextViewText(R.id.coc_freshness, (if (stale) "Old export · " else "Saved ") + DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(selected.optLong("exportedAt"))) + " · Estimates")
        } else {
          view.setTextViewText(R.id.coc_meta, if (deletedSelection) "Choose another village in widget settings" else "${accounts.size} saved villages · Estimates")
          if (!deletedSelection) accounts.take(rowLimit).forEach { account ->
            val rows = account.optJSONArray("rows")
            val next = (0 until (rows?.length() ?: 0)).map { rows!!.getJSONObject(it) }.filter { it.optLong("end") > now }.minByOrNull { it.optLong("end") }
            items.add(JSONObject().put("name", account.optString("name")).put("level", "TH ${account.optInt("townHall")}")
              .put("end", next?.optLong("end") ?: 0L).put("overviewHint", next?.optString("name") ?: "No running timers"))
          }
          view.setTextViewText(R.id.coc_next, if (accounts.isEmpty()) "Open COCWidget to import a village" else "Each widget keeps its own village selection")
          view.setTextViewText(R.id.coc_freshness, "Based on saved snapshots · Open app for details")
        }
        val rowIds = intArrayOf(R.id.coc_row_one, R.id.coc_row_two, R.id.coc_row_three)
        if (selected != null && items.isEmpty()) {
          items.add(JSONObject().put("name", "No running timers").put("level", "Import after changes in-game").put("end", 0L))
        }
        rowIds.forEachIndexed { index, rowId ->
          val item = items.getOrNull(index)
          view.setViewVisibility(rowId, if (item == null) View.GONE else View.VISIBLE)
          if (item != null) {
            val row = RemoteViews(context.packageName, if (narrow) R.layout.coc_widget_row_narrow else R.layout.coc_widget_row)
            row.setTextViewText(R.id.coc_row_name, item.optString("name"))
            val end = item.optLong("end")
            val finishText = if (end > now) " · " + DateFormat.getDateTimeInstance(DateFormat.SHORT, DateFormat.SHORT).format(Date(end)) else ""
            row.setTextViewText(R.id.coc_row_level, item.optString("overviewHint", item.optString("level")) + finishText)
            row.setViewVisibility(R.id.coc_row_timer, if (end > now) View.VISIBLE else View.GONE)
            if (end > now) {
              row.setChronometer(R.id.coc_row_timer, SystemClock.elapsedRealtime() + end - now, null, true)
              row.setChronometerCountDown(R.id.coc_row_timer, true)
            }
            view.removeAllViews(rowId); view.addView(rowId, row)
          }
        }
        view.setContentDescription(R.id.coc_widget_root, title + ". " + (selected?.let {
          "Town Hall ${it.optInt("townHall")}. Based on export ${DateFormat.getDateTimeInstance().format(Date(it.optLong("exportedAt")))}. All completions and free builders are estimates."
        } ?: "Saved village snapshots. Completions are estimates."))
        val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (launch != null) {
          launch.action = Intent.ACTION_VIEW
          launch.data = if (selected != null) Uri.parse("cocwidget://village?tag=" + Uri.encode(selected.optString("tag"))) else Uri.parse("cocwidget://villages")
          view.setOnClickPendingIntent(R.id.coc_widget_root, PendingIntent.getActivity(context, id, launch, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        }
        return view to items.map { it.optLong("end") }.filter { it > now }.minOrNull()
      }
      // Let the host choose the orientation-specific layout, including while the app is closed.
      val landscape = render(options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 180), options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, 340))
      val portrait = render(options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 300), options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 280))
      manager.updateAppWidget(id, RemoteViews(landscape.first, portrait.first))
      val next = listOfNotNull(landscape.second, portrait.second).minOrNull()
      val alarm = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (next != null) alarm.set(AlarmManager.ELAPSED_REALTIME_WAKEUP, SystemClock.elapsedRealtime() + next - now + 1000, refreshIntent(context, id))
      else alarm.cancel(refreshIntent(context, id))
    }
  }
}
