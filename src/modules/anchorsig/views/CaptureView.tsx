'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { edgeQueue } from '../../../core/edge-queue';
import { hashFile } from '../../../core/media-hash';
import { AnchorSigPayload } from '../schema';
import { compressImageAsJpeg } from '../../sdk/compression/image-compression';
import { useDraftState } from '../../sdk/state/useDraftState';

export function CaptureView() {
  const [assetId, setAssetId, clearAssetId] = useDraftState('anchorsig_assetId', '');
  const [location, setLocation, clearLocation] = useDraftState('anchorsig_location', '');
  const [status, setStatus, clearStatus] = useDraftState('anchorsig_status', 'In Transit');
  const [notes, setNotes, clearNotes] = useDraftState('anchorsig_notes', '');
  const [file, setFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !location) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let mediaData: any[] = [];
      if (file) {
        if (file.size > 80 * 1024 * 1024) {
          throw new Error('File exceeds 80MB limit.');
        }
        
        let finalFileToHash = file;
        let originalHash = null;

        if (file.type.startsWith('image/')) {
          try {
            const compressedFile = await compressImageAsJpeg(file);
            finalFileToHash = compressedFile;
            
            try {
               originalHash = await hashFile(file);
            } catch (hashErr) {
               console.warn("Failed to hash original large image", hashErr);
            }
          } catch (compressErr) {
            console.warn('Compression failed, falling back to original file', compressErr);
          }
        }

        const fileHash = await hashFile(finalFileToHash);
        mediaData.push({
          uri: `local://${finalFileToHash.name}`,
          hash: fileHash,
          mime_type: finalFileToHash.type || 'application/octet-stream',
          original_hash: originalHash || undefined
        });
      }

      const payload: AnchorSigPayload = {
        domain: 'anchorsig',
        type: 'continuity_log',
        timestamp: new Date().toISOString(),
        data: {
          asset_id: assetId,
          location,
          status,
          notes: notes || undefined
        },
        ...(mediaData.length > 0 && { media: mediaData })
      };

      await edgeQueue.enqueue('Observation', {
        actor_id: 'anchorsig_field_agent',
        payload: payload,
        signature: 'mock_signature' // Mocked pending HSM integration
      });

      setSuccessMsg('Signature captured and evidence queued successfully.');
      
      // Clear drafts on successful queue
      clearAssetId();
      clearLocation();
      clearStatus();
      clearNotes();
      
      setFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to queue continuity log');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
        <h2 style={{ margin: 0 }}>AnchorSig</h2>
        <nav style={{ display: 'flex', gap: '16px' }}>
          <Link href="/anchorsig/capture" style={{ fontWeight: 'bold', textDecoration: 'none', color: '#0070f3' }}>Log Asset</Link>
          <Link href="/anchorsig/replay" style={{ textDecoration: 'none', color: '#333' }}>Continuity</Link>
        </nav>
      </header>

      {successMsg && (
        <div role="alert" style={{ color: '#155724', backgroundColor: '#d4edda', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div role="alert" style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
          Error: {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor="assetId" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Asset ID</label>
          <input 
            id="assetId" 
            type="text" 
            value={assetId} 
            onChange={e => setAssetId(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        
        <div>
          <label htmlFor="location" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Current Location</label>
          <input 
            id="location" 
            type="text" 
            value={location} 
            onChange={e => setLocation(e.target.value)} 
            required
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="status" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Status</label>
          <select 
            id="status" 
            value={status} 
            onChange={e => setStatus(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="In Transit">In Transit</option>
            <option value="Received">Received</option>
            <option value="Secured">Secured</option>
            <option value="Compromised">Compromised</option>
          </select>
        </div>

        <div>
          <label htmlFor="notes" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Notes (Optional)</label>
          <textarea 
            id="notes" 
            value={notes} 
            onChange={e => setNotes(e.target.value)} 
            style={{ width: '100%', padding: '8px', boxSizing: 'border-box', minHeight: '80px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label htmlFor="media" style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>Evidence Photo</label>
          <input 
            id="media" 
            type="file" 
            accept="image/*"
            onChange={e => setFile(e.target.files?.[0] || null)} 
            style={{ width: '100%' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || !assetId || !location}
          style={{ 
            marginTop: '10px',
            padding: '12px', 
            backgroundColor: isSubmitting || !assetId || !location ? '#ccc' : '#0070f3', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px',
            fontWeight: 'bold',
            cursor: isSubmitting || !assetId || !location ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? 'Hashing & Queueing...' : 'Log Asset Continuity'}
        </button>
      </form>
    </div>
  );
}
