export class Filename {
  id!: number;
  job_id!: number;
  file_name!: string;
  output_file_name!: string;
  status!: string;
}

export class Jobs {
  finished_files!: number;
  id!: number;
  user_id!: number;
  date_created!: string;
  status!: string;
  num_files!: number;
  files_detailed!: Filename[];
}

export class User {
  id!: number;
  authentik_uid!: string;
  email!: string | null;
  username!: string | null;
  name!: string | null;
  groups_json!: string;
  entitlements_json!: string;
  created_at!: string;
  updated_at!: string;
}
