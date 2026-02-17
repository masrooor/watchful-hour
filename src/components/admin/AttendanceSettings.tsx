import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, Bell, Save, Loader2 } from "lucide-react";
import WorkdayHolidaySettings from "./WorkdayHolidaySettings";

interface AttendanceSettingsData {
  id: string;
  office_start_time: string;
  office_end_time: string;
  grace_period_minutes: number;
  allowed_latitude: number | null;
  allowed_longitude: number | null;
  allowed_radius_meters: number | null;
  location_name: string | null;
  location_restriction_enabled: boolean;
  notify_admin_on_late: boolean;
  notify_admin_on_absence: boolean;
  notify_employee_on_late: boolean;
  notify_employee_on_clockout: boolean;
  admin_notification_email: string | null;
  work_days: number[];
  probation_period_days: number;
  required_daily_hours: number;
}

const AttendanceSettings = () => {
  const [settings, setSettings] = useState<AttendanceSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("attendance_settings")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      toast.error("Failed to load settings");
      console.error(error);
    } else {
      setSettings(data as AttendanceSettingsData);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);

    const { id, ...updates } = settings;
    const { error } = await supabase
      .from("attendance_settings")
      .update(updates)
      .eq("id", id);

    if (error) {
      toast.error("Failed to save settings", { description: error.message });
    } else {
      toast.success("Settings saved successfully!");
    }
    setSaving(false);
  };

  const updateField = <K extends keyof AttendanceSettingsData>(
    key: K,
    value: AttendanceSettingsData[K]
  ) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No settings found. Contact your administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Office Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Office Hours & Grace Period</CardTitle>
          </div>
          <CardDescription>
            Configure working hours and the grace period before marking employees as late.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Office Start Time</Label>
              <Input
                id="start-time"
                type="time"
                value={settings.office_start_time}
                onChange={(e) => updateField("office_start_time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Office End Time</Label>
              <Input
                id="end-time"
                type="time"
                value={settings.office_end_time}
                onChange={(e) => updateField("office_end_time", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grace">Grace Period (minutes)</Label>
              <Input
                id="grace"
                type="number"
                min={0}
                max={120}
                value={settings.grace_period_minutes}
                onChange={(e) => updateField("grace_period_minutes", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Employees arriving after {settings.office_start_time} + {settings.grace_period_minutes} minutes will be marked as late.
          </p>
        </CardContent>
      </Card>

      {/* Location Restrictions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Location Restrictions</CardTitle>
          </div>
          <CardDescription>
            Restrict clock-in to a specific GPS location and radius.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Enable Location Restriction</p>
              <p className="text-xs text-muted-foreground">
                Only allow clock-in within the defined radius
              </p>
            </div>
            <Switch
              checked={settings.location_restriction_enabled}
              onCheckedChange={(v) => updateField("location_restriction_enabled", v)}
            />
          </div>

          {settings.location_restriction_enabled && (
            <>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Location Name</Label>
                  <Input
                    value={settings.location_name || ""}
                    onChange={(e) => updateField("location_name", e.target.value)}
                    placeholder="e.g. Main Office"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Latitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={settings.allowed_latitude ?? ""}
                    onChange={(e) => updateField("allowed_latitude", parseFloat(e.target.value) || null)}
                    placeholder="e.g. 24.8607"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Longitude</Label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={settings.allowed_longitude ?? ""}
                    onChange={(e) => updateField("allowed_longitude", parseFloat(e.target.value) || null)}
                    placeholder="e.g. 67.0011"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Allowed Radius (meters)</Label>
                  <Input
                    type="number"
                    min={50}
                    max={10000}
                    value={settings.allowed_radius_meters ?? 500}
                    onChange={(e) => updateField("allowed_radius_meters", parseInt(e.target.value) || 500)}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Notification Preferences</CardTitle>
          </div>
          <CardDescription>
            Configure who gets notified for attendance events.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Admin Notification Email</Label>
            <Input
              type="email"
              value={settings.admin_notification_email || ""}
              onChange={(e) => updateField("admin_notification_email", e.target.value || null)}
              placeholder="admin@company.com"
            />
          </div>
          <Separator />
          <div className="space-y-3">
            {([
              { key: "notify_admin_on_late" as const, label: "Notify admin on late arrival", desc: "Send alert when an employee clocks in late" },
              { key: "notify_admin_on_absence" as const, label: "Notify admin on absence", desc: "Send alert when an employee doesn't clock in by end of day" },
              { key: "notify_employee_on_late" as const, label: "Notify employee on late arrival", desc: "Show warning to the employee when they clock in late" },
              { key: "notify_employee_on_clockout" as const, label: "Notify employee on clock-out", desc: "Confirm clock-out with a notification" },
            ]).map((item) => (
              <div key={item.key} className="flex items-center justify-between py-1">
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch
                  checked={settings[item.key]}
                  onCheckedChange={(v) => updateField(item.key, v)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Workdays & Holidays */}
      <WorkdayHolidaySettings
        workDays={settings.work_days}
        onWorkDaysChange={(days) => updateField("work_days", days)}
      />

      {/* Required Daily Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Required Daily Hours</CardTitle>
          </div>
          <CardDescription>
            Set the required working hours per day (including lunch break) used for monthly hour calculations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="daily-hours">Hours per Day</Label>
            <Input
              id="daily-hours"
              type="number"
              min={1}
              max={24}
              step={0.5}
              value={settings.required_daily_hours}
              onChange={(e) => updateField("required_daily_hours", parseFloat(e.target.value) || 9)}
            />
            <p className="text-xs text-muted-foreground">
              Employees are expected to work {settings.required_daily_hours} hours per day. Shortfalls will be flagged in monthly reports.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Probation Period */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Probation Period</CardTitle>
          </div>
          <CardDescription>
            Set the default probation period length for new employees.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="probation-days">Probation Period (days)</Label>
            <Input
              id="probation-days"
              type="number"
              min={1}
              max={365}
              value={settings.probation_period_days}
              onChange={(e) => updateField("probation_period_days", parseInt(e.target.value) || 90)}
            />
            <p className="text-xs text-muted-foreground">
              Employees on probation will be flagged {settings.probation_period_days} days after their joining date.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default AttendanceSettings;
