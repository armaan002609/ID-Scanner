import Papa from 'papaparse';
import { type ScannedRecord } from './db';

export function downloadRecordsAsCSV(records: ScannedRecord[], filename = 'scanned_ids.csv') {
  // Format dates and ensure columns are ordered nicely
  const dataToExport = records.map(record => ({
    Name: record.name,
    'Roll No': record.rollNo,
    Course: record.course,
    Section: record.section,
    Email: record.email,
    'Scanned At': new Date(record.scannedAt).toLocaleString(),
  }));

  const csv = Papa.unparse(dataToExport);

  // Create a blob and trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
