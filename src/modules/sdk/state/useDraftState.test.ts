import { renderHook, act } from '@testing-library/react';
import { useDraftState } from './useDraftState';

describe('useDraftState', () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    jest.spyOn(window.sessionStorage, 'getItem');
    jest.spyOn(window.sessionStorage, 'setItem');
    jest.spyOn(window.sessionStorage, 'removeItem');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should initialize with initial value when storage is empty', () => {
    const { result } = renderHook(() => useDraftState('test_key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('should persist state to sessionStorage when state changes', () => {
    const { result } = renderHook(() => useDraftState('test_key', 'initial'));
    
    act(() => {
      result.current[1]('new_value');
    });

    expect(result.current[0]).toBe('new_value');
    expect(window.sessionStorage.setItem).toHaveBeenCalledWith(
      'draft_test_key',
      expect.stringContaining('"value":"new_value"')
    );
  });

  it('should restore state from sessionStorage on mount', () => {
    window.sessionStorage.setItem('draft_test_key', JSON.stringify({ value: 'restored_value', timestamp: Date.now() }));
    
    const { result } = renderHook(() => useDraftState('test_key', 'initial'));
    expect(result.current[0]).toBe('restored_value');
  });

  it('should clear draft and reset to initial value when clearDraft is called', () => {
    const { result } = renderHook(() => useDraftState('test_key', 'initial'));
    
    act(() => {
      result.current[1]('new_value');
    });
    
    act(() => {
      result.current[2](); // clearDraft
    });

    expect(result.current[0]).toBe('initial');
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('draft_test_key');
  });

  it('should expire state if expirationMs has passed', () => {
    const pastTimestamp = Date.now() - 10000;
    window.sessionStorage.setItem('draft_test_key', JSON.stringify({ value: 'stale_value', timestamp: pastTimestamp }));
    
    const { result } = renderHook(() => useDraftState('test_key', 'initial', 5000));
    
    expect(result.current[0]).toBe('initial'); // Expired, so we get initial
    expect(window.sessionStorage.removeItem).toHaveBeenCalledWith('draft_test_key');
  });
});
