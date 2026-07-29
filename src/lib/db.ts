import Dexie, { type EntityTable } from 'dexie';

export interface ScannedRecord {
  id?: number;
  name: string;
  course: string;
  rollNo: string;
  email: string;
  section: string;
  scannedAt: string;
  status: 'pending' | 'exported';
}

const db = new Dexie('IDScannerDatabase') as Dexie & {
  records: EntityTable<
    ScannedRecord,
    'id' // primary key "id" (for the typings only)
  >;
};

// Schema declaration
db.version(1).stores({
  records: '++id, rollNo, email, status, scannedAt' // primary key "id" (for the runtime)
});

export { db };
