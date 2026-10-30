import { RowDataPacket } from "mysql2";

export interface User extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  password_algo: string;
  created_at: Date;
  updated_at: Date;
}
