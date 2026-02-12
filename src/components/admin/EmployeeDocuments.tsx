import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, FileText, Trash2, Download } from "lucide-react";

interface EmployeeDocumentsProps {
  profiles: any[];
  isAdminOrHR: boolean;
}

interface DocFile {
  name: string;
  id: string;
  created_at: string;
  metadata: any;
  userId: string;
}

const EmployeeDocuments = ({ profiles, isAdminOrHR }: EmployeeDocumentsProps) => {
  const { user } = useAuth();
  const [files, setFiles] = useState<DocFile[]>([]);
  const [selectedUser, setSelectedUser] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [uploadUserId, setUploadUserId] = useState("");

  const fetchFiles = async () => {
    const userIds = selectedUser === "all"
      ? profiles.map((p) => p.user_id)
      : [selectedUser];

    const allFiles: DocFile[] = [];
    for (const uid of userIds) {
      const { data } = await supabase.storage.from("employee-documents").list(uid);
      if (data) {
        allFiles.push(...data.map((f) => ({ ...f, userId: uid })));
      }
    }
    setFiles(allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  };

  useEffect(() => {
    if (profiles.length > 0) fetchFiles();
  }, [profiles, selectedUser]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetUser = uploadUserId || user!.id;

    setUploading(true);
    const path = `${targetUser}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("employee-documents").upload(path, file);

    if (error) {
      toast.error("Upload failed: " + error.message);
    } else {
      toast.success("Document uploaded");
      fetchFiles();
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDownload = async (file: DocFile) => {
    const { data } = await supabase.storage
      .from("employee-documents")
      .createSignedUrl(`${file.userId}/${file.name}`, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    } else {
      toast.error("Failed to get download link");
    }
  };

  const handleDelete = async (file: DocFile) => {
    const { error } = await supabase.storage
      .from("employee-documents")
      .remove([`${file.userId}/${file.name}`]);

    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Document deleted");
      fetchFiles();
    }
  };

  const getEmployeeName = (userId: string) => {
    return profiles.find((p) => p.user_id === userId)?.name || "Unknown";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        {isAdminOrHR && (
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by employee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2 ml-auto">
          {isAdminOrHR && (
            <Select value={uploadUserId} onValueChange={setUploadUserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Upload for..." />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>{p.name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Label htmlFor="doc-upload" className="cursor-pointer">
            <Button size="sm" asChild disabled={uploading}>
              <span>
                <Upload className="w-4 h-4 mr-1" />
                {uploading ? "Uploading..." : "Upload"}
              </span>
            </Button>
          </Label>
          <Input id="doc-upload" type="file" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No documents uploaded yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {files.map((f) => (
            <div key={`${f.userId}-${f.name}`} className="glass-card rounded-xl p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{f.name.replace(/^\d+-/, "")}</p>
                <p className="text-xs text-muted-foreground">{getEmployeeName(f.userId)}</p>
                <p className="text-xs text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDownload(f)}>
                  <Download className="w-3.5 h-3.5" />
                </Button>
                {isAdminOrHR && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-late" onClick={() => handleDelete(f)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeDocuments;
