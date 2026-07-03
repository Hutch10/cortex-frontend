# Module SDK Documentation

The Module SDK is a reusable helper library for HutchStack modules. It strictly contains domain-agnostic utilities. It has no awareness of Cortex or Forge.

## `compression/image-compression.ts`
Provides browser-native HTML5 `<canvas>` resizing to prevent Mobile OOMs and 3G timeouts.
- `compressImageAsJpeg(file: File, options?: {...}): Promise<File>`

## `state/useDraftState.ts`
A React hook drop-in replacement for `useState` that mitigates app-switching and browser suspension data loss by persisting volatile state to `sessionStorage`.

### Signature
```typescript
function useDraftState<T>(key: string, initialValue: T, expirationMs?: number): readonly [T, React.Dispatch<React.SetStateAction<T>>, () => void]
```

### Usage
```tsx
import { useDraftState } from '../../sdk/state/useDraftState';

export function CaptureForm() {
  const [notes, setNotes, clearNotes] = useDraftState('my_module_notes', '');

  const onSubmit = async () => {
     await edgeQueue.enqueue({...});
     // Clear the draft from sessionStorage upon success
     clearNotes();
  };

  return <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />;
}
```
