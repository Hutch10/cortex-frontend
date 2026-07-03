export async function hashFile(file: File): Promise<string> {
  return new Promise(async (resolve, reject) => {
    if (typeof window === 'undefined' || !window.Worker) {
      // Fallback for SSR or non-worker environments
      try {
        const arrayBuffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return resolve(hashHex);
      } catch (err) {
        return reject(err);
      }
    }

    const worker = new Worker('/hash-worker.js');
    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.error) {
        reject(new Error(e.data.error));
      } else {
        resolve(e.data.hashHex);
      }
    };
    worker.onerror = (err) => {
      worker.terminate();
      reject(err);
    };

    const arrayBuffer = await file.arrayBuffer();
    worker.postMessage({ fileBuffer: arrayBuffer }, [arrayBuffer]);
  });
}
