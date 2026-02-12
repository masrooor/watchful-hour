import { Employee, AttendanceRecord } from "@/types/attendance";

export const mockEmployees: Employee[] = [
  { id: "1", name: "Sarah Chen", department: "Engineering", avatar: "SC", email: "sarah@company.com" },
  { id: "2", name: "James Wilson", department: "Design", avatar: "JW", email: "james@company.com" },
  { id: "3", name: "Maria Garcia", department: "Marketing", avatar: "MG", email: "maria@company.com" },
  { id: "4", name: "David Kim", department: "Engineering", avatar: "DK", email: "david@company.com" },
  { id: "5", name: "Emily Brown", department: "HR", avatar: "EB", email: "emily@company.com" },
  { id: "6", name: "Alex Turner", department: "Sales", avatar: "AT", email: "alex@company.com" },
  { id: "7", name: "Priya Patel", department: "Engineering", avatar: "PP", email: "priya@company.com" },
  { id: "8", name: "Tom Anderson", department: "Finance", avatar: "TA", email: "tom@company.com" },
];

const today = new Date().toISOString().split("T")[0];

export const mockAttendance: AttendanceRecord[] = [
  { id: "a1", employeeId: "1", date: today, clockIn: "08:55", clockOut: "17:30", status: "on-time", latitude: 37.7749, longitude: -122.4194, locationName: "HQ Office" },
  { id: "a2", employeeId: "2", date: today, clockIn: "09:22", clockOut: null, status: "late", latitude: 37.7751, longitude: -122.4180, locationName: "HQ Office" },
  { id: "a3", employeeId: "3", date: today, clockIn: "08:45", clockOut: null, status: "on-time", latitude: 37.7749, longitude: -122.4190, locationName: "HQ Office" },
  { id: "a4", employeeId: "4", date: today, clockIn: null, clockOut: null, status: "absent", latitude: null, longitude: null, locationName: null },
  { id: "a5", employeeId: "5", date: today, clockIn: "09:35", clockOut: null, status: "late", latitude: 37.7755, longitude: -122.4175, locationName: "Branch Office" },
  { id: "a6", employeeId: "6", date: today, clockIn: "08:58", clockOut: null, status: "on-time", latitude: 37.7748, longitude: -122.4192, locationName: "HQ Office" },
  { id: "a7", employeeId: "7", date: today, clockIn: null, clockOut: null, status: "pending", latitude: null, longitude: null, locationName: null },
  { id: "a8", employeeId: "8", date: today, clockIn: "09:15", clockOut: null, status: "late", latitude: 37.7750, longitude: -122.4188, locationName: "HQ Office" },
];
