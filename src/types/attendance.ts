export interface Employee {
  id: string;
  name: string;
  department: string;
  avatar: string;
  email: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: 'on-time' | 'late' | 'absent' | 'pending';
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
}

export interface AttendanceStats {
  totalEmployees: number;
  present: number;
  late: number;
  absent: number;
  onTime: number;
}
