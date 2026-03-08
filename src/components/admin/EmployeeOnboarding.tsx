import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ClipboardCheck, Plus, UserPlus, CheckCircle2, Circle, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface OnboardingTask {
  id: string;
  label: string;
  completed: boolean;
}

const DEFAULT_CHECKLIST: string[] = [
  "Collect personal documents (CNIC, photos)",
  "Create email account",
  "Assign employee ID badge",
  "Set up workstation / equipment",
  "Add to attendance system",
  "Share company policies & handbook",
  "Introduce to team / department",
  "Assign mentor or buddy",
  "Complete orientation session",
  "Set up payroll & bank details",
];

interface EmployeeOnboardingProps {
  profiles: any[];
}

const EmployeeOnboarding = ({ profiles }: EmployeeOnboardingProps) => {
  const [checklists, setChecklists] = useState<Record<string, OnboardingTask[]>>({});
  const [showSetup, setShowSetup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [customTask, setCustomTask] = useState("");

  // Filter probation employees for onboarding
  const probationEmployees = profiles.filter(
    (p) => p.job_status === "probation"
  );

  const getChecklist = (userId: string): OnboardingTask[] => {
    if (checklists[userId]) return checklists[userId];
    const list = DEFAULT_CHECKLIST.map((label, i) => ({
      id: `task-${i}`,
      label,
      completed: false,
    }));
    return list;
  };

  const initChecklist = (userId: string) => {
    if (!checklists[userId]) {
      setChecklists((prev) => ({
        ...prev,
        [userId]: DEFAULT_CHECKLIST.map((label, i) => ({
          id: `task-${i}`,
          label,
          completed: false,
        })),
      }));
    }
    setSelectedUserId(userId);
    setShowSetup(true);
  };

  const toggleTask = (userId: string, taskId: string) => {
    setChecklists((prev) => ({
      ...prev,
      [userId]: (prev[userId] || getChecklist(userId)).map((t) =>
        t.id === taskId ? { ...t, completed: !t.completed } : t
      ),
    }));
  };

  const addCustomTask = () => {
    if (!customTask.trim() || !selectedUserId) return;
    setChecklists((prev) => ({
      ...prev,
      [selectedUserId]: [
        ...(prev[selectedUserId] || getChecklist(selectedUserId)),
        { id: `custom-${Date.now()}`, label: customTask.trim(), completed: false },
      ],
    }));
    setCustomTask("");
    toast.success("Task added");
  };

  const selectedProfile = profiles.find((p) => p.user_id === selectedUserId);
  const selectedChecklist = selectedUserId ? getChecklist(selectedUserId) : [];
  const completedCount = (checklists[selectedUserId] || selectedChecklist).filter((t) => t.completed).length;
  const totalCount = (checklists[selectedUserId] || selectedChecklist).length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{probationEmployees.length}</p>
              <p className="text-xs text-muted-foreground">Probation Employees</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-on-time/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-on-time" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(checklists).filter((cl) => cl.every((t) => t.completed)).length}
              </p>
              <p className="text-xs text-muted-foreground">Fully Onboarded</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {Object.values(checklists).filter((cl) => cl.some((t) => !t.completed)).length}
              </p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Joining Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {probationEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No probation employees found
                </TableCell>
              </TableRow>
            ) : (
              probationEmployees.map((p) => {
                const cl = checklists[p.user_id];
                const done = cl ? cl.filter((t) => t.completed).length : 0;
                const total = cl ? cl.length : DEFAULT_CHECKLIST.length;
                const pct = total > 0 ? (done / total) * 100 : 0;
                const allDone = cl ? cl.every((t) => t.completed) : false;

                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {(p.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.employee_id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.department || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.joining_date || "—"}</TableCell>
                    <TableCell>
                      {allDone ? (
                        <Badge variant="outline" className="bg-on-time/10 text-on-time border-on-time/20">Complete</Badge>
                      ) : cl ? (
                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">In Progress</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Not Started</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{done}/{total}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => initChecklist(p.user_id)}>
                        <ClipboardCheck className="w-3.5 h-3.5 mr-1" />
                        {cl ? "View" : "Start"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              Onboarding: {selectedProfile?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm font-medium">{completedCount}/{totalCount}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="space-y-1.5 mt-2">
            {(checklists[selectedUserId] || selectedChecklist).map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(selectedUserId, task.id)}
                />
                <span className={`text-sm ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.label}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-3">
            <Input
              placeholder="Add custom task..."
              value={customTask}
              onChange={(e) => setCustomTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomTask()}
            />
            <Button size="sm" onClick={addCustomTask} disabled={!customTask.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetup(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeOnboarding;
