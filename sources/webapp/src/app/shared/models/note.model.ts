export interface NoteBase {
  title: string;
  content: string;
}

export interface Note extends NoteBase {
  id: string;
  rev: string;
  metadata: NoteMetadata;
}

export interface NoteMetadata {
  createdAt: Date;
  updatedAt?: Date | undefined;
}