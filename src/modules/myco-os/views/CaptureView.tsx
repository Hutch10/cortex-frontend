'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { edgeQueue } from '../../../core/edge-queue';
import { hashFile } from '../../../core/media-hash';
import { MycoObservationPayload } from '../schema';
import { compressImageAsJpeg } from '../../sdk/compression/image-compression';
import { useDraftState } from '../../sdk/state/useDraftState';

export function CaptureView() {
  const [species, setSpecies, clearSpecies] = useDraftState('myco_species', '');
  const [notes, setNotes, clearNotes] = useDraftState('myco_notes', '');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!window.navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (f.size > 80 * 1024 * 1024) {
        setStatus('Error: File exceeds the 80MB maximum size limit.');
        return;
      }
      setFile(f);
    }
  };

  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Hashing and Queueing...');
    setIsProcessing(true);
    
    try {
      const mediaList = [];
      if (file) {
        let finalFileToHash = file;
        let originalHash = null;

        // T-2: Attempt client-side image compression
        if (file.type.startsWith('image/')) {
          try {
            setStatus('Compressing image...');
            const compressedFile = await compressImageAsJpeg(file);
            finalFileToHash = compressedFile;
            
            // Try to optionally hash the original to preserve metadata chain (OOM safe check)
            // But we ignore failure if it throws OOM. We will just use the compressed.
            try {
               originalHash = await hashFile(file);
            } catch (hashErr) {
               console.warn("Failed to hash original large image, preserving only compressed hash", hashErr);
            }

          } catch (compressErr: any) {
            console.warn('Compression failed, falling back to original file', compressErr);
            // We just fall back to the original file
          }
        }

        setStatus('Hashing evidence...');
        const hash = await hashFile(finalFileToHash);
        
        // We use a mock URI for the MVP to represent an external object store
        const uri = `s3://myco-bucket/${finalFileToHash.name}`;
        mediaList.push({
          uri,
          hash,
          mime_type: finalFileToHash.type,
          original_hash: originalHash || undefined
        });
      }

      const payload: MycoObservationPayload = {
        domain: 'myco',
        type: 'field_observation',
        timestamp: new Date().toISOString(),
        data: {
          species_guess: species,
          notes: notes,
        },
        media: mediaList
      };

      // T-4: Queue Integration - Delegate strictly to Forge Edge Queue
      setStatus('Queueing offline...');
      await edgeQueue.enqueue('Observation', {
        actor_id: 'myco-user-1',
        signature: 'mock_signature', // Mocked due to beta limitation
        payload: payload
      });

      setStatus(isOffline ? 'Queued offline. Will sync when online.' : 'Observation queued and syncing...');
      
      // Clear drafts on successful queue
      clearSpecies();
      clearNotes();
      
      setFile(null);
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const inputStyle = { width: '100%', padding: '12px', minHeight: '44px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>Myco OS</h2>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link href="/myco-os/capture" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#0070f3' }}>Capture</Link>
          <Link href="/myco-os/replay" style={{ textDecoration: 'none', color: '#333' }}>Timeline</Link>
        </nav>
      </header>

      {isOffline && (
        <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '12px', borderRadius: '4px', marginBottom: '16px', minHeight: '44px', display: 'flex', alignItems: 'center' }}>
          ⚠️ You are currently offline. Captures will be safely queued.
        </div>
      )}

      <form onSubmit={handleCapture} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="species-input" style={labelStyle}>Species Guess:</label>
          <input 
            id="species-input"
            type="text" 
            value={species} 
            onChange={(e) => setSpecies(e.target.value)}
            style={inputStyle}
            required
            aria-required="true"
            disabled={isProcessing}
          />
        </div>
        <div>
          <label htmlFor="notes-input" style={labelStyle}>Notes:</label>
          <textarea 
            id="notes-input"
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            style={{ ...inputStyle, minHeight: '88px', resize: 'vertical' }}
            disabled={isProcessing}
          />
        </div>
        <div>
          <label htmlFor="file-input" style={labelStyle}>Attach Media:</label>
          <input 
            id="file-input"
            type="file" 
            accept="image/*"
            onChange={handleFileChange}
            style={{ ...inputStyle, padding: '8px' }}
            disabled={isProcessing}
          />
        </div>
        <button 
          type="submit" 
          disabled={isProcessing}
          style={{ 
            padding: '12px', 
            minHeight: '44px', 
            backgroundColor: isProcessing ? '#a0c4ff' : '#0070f3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: isProcessing ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            marginTop: '8px'
          }}
        >
          {isProcessing ? 'Processing...' : 'Capture & Queue'}
        </button>
      </form>
      {status && (
        <div role="status" aria-live="polite" style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '4px' }}>
          {status}
        </div>
      )}
    </div>
  );
}
