import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, Plus, Trash2, Loader2, CalendarCheck } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface Holiday {
  id: string;
  date: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface WorkdayHolidaySettingsProps {
  workDays: number[];
  onWorkDaysChange: (days: number[]) => void;
}

const WorkdayHolidaySettings = ({ workDays, onWorkDaysChange }: WorkdayHolidaySettingsProps) => {
  const { user } = useAuth();
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState<Date | undefined>();
  const [adding, setAdding] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setHolidays(data || []);
    }
    setLoadingHolidays(false);
  };

  const toggleDay = (day: number) => {
    if (workDays.includes(day)) {
      onWorkDaysChange(workDays.filter((d) => d !== day));
    } else {
      onWorkDaysChange([...workDays, day].sort());
    }
  };

  const addHoliday = async () => {
    if (!newHolidayDate || !newHolidayName.trim() || !user) return;
    setAdding(true);

    const dateStr = format(newHolidayDate, "yyyy-MM-dd");
    const { error } = await supabase.from("holidays").insert({
      date: dateStr,
      name: newHolidayName.trim(),
      created_by: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("A holiday already exists on this date");
      } else {
        toast.error("Failed to add holiday", { description: error.message });
      }
    } else {
      toast.success("Holiday added");
      setNewHolidayName("");
      setNewHolidayDate(undefined);
      fetchHolidays();
    }
    setAdding(false);
  };

  const deleteHoliday = async (id: string) => {
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete holiday");
    } else {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      toast.success("Holiday removed");
    }
  };

  const upcomingHolidays = holidays.filter((h) => new Date(h.date) >= new Date(new Date().toISOString().split("T")[0]));
  const pastHolidays = holidays.filter((h) => new Date(h.date) < new Date(new Date().toISOString().split("T")[0]));

  return (
    <div className="space-y-6">
      {/* Workdays */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Workdays</CardTitle>
          </div>
          <CardDescription>
            Select which days of the week are working days.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, idx) => (
              <button
                key={idx}
                onClick={() => toggleDay(idx)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                  workDays.includes(idx)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-muted-foreground border-border hover:bg-accent"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {workDays.length} working day{workDays.length !== 1 ? "s" : ""} per week
          </p>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Holidays</CardTitle>
          </div>
          <CardDescription>
            Mark specific dates as holidays. Employees won't be expected to clock in on these days.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add holiday form */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Holiday Name</Label>
              <Input
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g. Independence Day"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-[180px] justify-start text-left font-normal",
                      !newHolidayDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {newHolidayDate ? format(newHolidayDate, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newHolidayDate}
                    onSelect={(d) => {
                      setNewHolidayDate(d);
                      setCalendarOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end">
              <Button
                onClick={addHoliday}
                disabled={adding || !newHolidayName.trim() || !newHolidayDate}
                size="default"
              >
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
                Add
              </Button>
            </div>
          </div>

          <Separator />

          {/* Holiday list */}
          {loadingHolidays ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : holidays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No holidays configured yet.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingHolidays.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Upcoming & Today
                  </p>
                  <div className="space-y-1.5">
                    {upcomingHolidays.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="font-mono text-xs">
                            {format(new Date(h.date), "MMM d, yyyy")}
                          </Badge>
                          <span className="text-sm font-medium">{h.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteHoliday(h.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastHolidays.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Past
                  </p>
                  <div className="space-y-1.5">
                    {pastHolidays.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg border bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="font-mono text-xs">
                            {format(new Date(h.date), "MMM d, yyyy")}
                          </Badge>
                          <span className="text-sm text-muted-foreground">{h.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteHoliday(h.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkdayHolidaySettings;
