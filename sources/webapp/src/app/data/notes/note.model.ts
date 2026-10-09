export interface Note {
  id: string;
  rev: string;
  title: string;
  content: string;
  metadata: NoteMetadata;
}

export interface NoteMetadata {
  createdAt: Date;
  updatedAt?: Date | undefined;
  tags: string[];
}