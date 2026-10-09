export interface BaseDocument {
  _id: string;
  _rev: string;
}

export interface DocumentChange<T extends BaseDocument> {
  id: string;
  deleted: boolean;
  doc?: T;
}