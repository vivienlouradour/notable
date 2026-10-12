import { Note } from '../app/data/notes/note.model';

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note:test',
    rev: '1-test',
    title: 'Test note',
    content: 'Test content',
    metadata: { createdAt: new Date('2026-01-01T12:00:00Z'), tags: [] },
    ...overrides,
  };
}

export function requiredElement<T extends Element>(
  root: ParentNode,
  selector: string
): T {
  const element = root.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Missing element: ${selector}`);
  }
  return element;
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
