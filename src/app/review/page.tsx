'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, Save, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';
import Link from 'next/link';
import { createWorker } from 'tesseract.js';
import { parseOCRText } from '@/lib/ocr-mapping';

export default function ReviewPage() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [course, setCourse] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [email, setEmail] = useState('');
  const [section, setSection] = useState('');
  
  const [confidence, setConfidence] = useState<'high'|'low'|'not_found'>('not_found');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dataUrl = sessionStorage.getItem('scannedImage');
    if (!dataUrl) {
      router.replace('/scan');
      return;
    }
    setImage(dataUrl);
    processImage(dataUrl);
  }, [router]);

  const processImage = async (base64Img: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const geminiApiKey = localStorage.getItem('geminiApiKey') || '';
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Img, geminiApiKey })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to extract data from image.');
      }
      
      const extractedFields = data.fields;

      setName(extractedFields.name || '');
      setCourse(extractedFields.course || '');
      setRollNo(extractedFields.rollNo || '');
      setConfidence(extractedFields.confidence);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error while processing image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await db.records.add({
        name,
        course,
        rollNo,
        email,
        section,
        scannedAt: new Date().toISOString(),
        status: 'pending'
      });
      
      sessionStorage.removeItem('scannedImage');
      // Briefly show success before navigating
      setTimeout(() => router.push('/'), 300);
      
    } catch (err) {
      console.error('Failed to save to db:', err);
      setError('Failed to save record locally.');
      setIsSaving(false);
    }
  };

  if (!image) return null;

  if (isProcessing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <h2 className="text-xl font-semibold">Reading Card...</h2>
        <p className="text-sm text-slate-500 mt-2">Extracting details using AI</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-lg mx-auto pb-24">
      <div className="flex items-center mb-6">
        <Link href="/scan" className="p-2 -ml-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-bold ml-2">Review & Edit</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl flex items-start text-sm">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p>{error}. You can enter details manually.</p>
        </div>
      )}

      {confidence === 'low' && !error && (
        <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-xs font-medium border border-amber-200 dark:border-amber-800">
          ⚠️ Double check the extracted fields. The scan confidence was low.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="glass-dark p-4 rounded-xl flex justify-center mb-6">
          <img src={image} alt="Scanned ID" className="h-32 object-contain rounded-lg shadow-sm" />
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Extracted Data</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input 
              required
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              className="w-full p-3 rounded-xl border bg-surface border-border focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Roll Number</label>
            <input 
              required
              type="text" 
              value={rollNo} 
              onChange={e => setRollNo(e.target.value)}
              className="w-full p-3 rounded-xl border bg-surface border-border focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Course / Program</label>
            <input 
              required
              type="text" 
              value={course} 
              onChange={e => setCourse(e.target.value)}
              className="w-full p-3 rounded-xl border bg-surface border-border focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Manual Entry</h2>
          
          <div>
            <label className="block text-sm font-medium mb-1">Email Address</label>
            <input 
              required
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              placeholder="student@college.edu"
              className="w-full p-3 rounded-xl border bg-surface border-border focus:ring-2 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section / Cohort</label>
            <select
              required
              value={section}
              onChange={e => setSection(e.target.value)}
              className="w-full p-3 rounded-xl border bg-surface border-border focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
            >
              <option value="" disabled>Select a section</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Floating Action Button for Save */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-10">
          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full max-w-lg mx-auto py-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-white font-semibold shadow-lg shadow-blue-500/30 disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Save className="h-5 w-5" />
                <span>Save Record</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
