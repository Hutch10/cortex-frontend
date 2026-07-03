self.addEventListener('message', async (e) => {
  const { fileBuffer } = e.data;
  
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    self.postMessage({ hashHex });
  } catch (err) {
    self.postMessage({ error: err instanceof Error ? err.message : 'Unknown hash error' });
  }
});
