export type Role = "superadmin" | "admin" | "tutor" | "student";
export type FileStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  full_name: string;
  role: Role;
}

export interface FileItem {
  id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  status: FileStatus;
  rejection_reason: string | null;
  class_group: string;
  uploader_id: number;
  uploaded_at: string;
  reviewed_at: string | null;
}

export interface AppUser {
  id: number;
  full_name: string;
  username: string;
  role: Role;
  is_active: boolean;
  created_at: string;
}

export interface SchoolClass {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  tutors: AppUser[];
}

// ---- Shares: the main flow. Receivers never see AppUser/auth at all. ----

export interface ShareFile {
  id: number;
  original_name: string;
  content_type: string;
  size_bytes: number;
  sha256?: string;
  scan_status?: "clean" | "suspicious" | "unscanned";
  scan_message?: string;
}

export interface Share {
  id: number;
  code: string;
  label: string;
  created_at: string;
  expires_at: string | null;
  is_active: boolean;
  class_id: number | null;
  class_name: string | null;
  files: ShareFile[];
}

export interface ShareCreateResponse {
  share: Share;
  combined_code: string;
  join_url: string;
  qr_url: string;
}

// A locally-stored record of a share a receiver has opened — lets them
// revisit it later without needing to type the code again. Purely local;
// the server has no idea this history exists.
export interface ReceivedShareRecord {
  code: string;
  label: string;
  serverUrl: string;
  firstViewedAt: string;
  fileNames: string[];
}
