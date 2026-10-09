import { NotableModel } from "../model";

export interface Note extends NotableModel {
  title: string;
  content: string;
  metadata: NoteMetadata;
}

export interface NoteMetadata {
  createdAt: Date;
  updatedAt?: Date | undefined;
  tags: string[];
}