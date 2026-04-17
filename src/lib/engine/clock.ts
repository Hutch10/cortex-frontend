export interface Clock {
    now(): number;
}

export class RealClock implements Clock {
    now(): number {
        return Date.now();
    }
}

export class DeterministicTestClock implements Clock {
    public currentTime: number;
    
    constructor(initialTime: number) {
        this.currentTime = initialTime;
    }
    
    now(): number {
        return this.currentTime;
    }
    
    advance(ms: number) {
        this.currentTime += ms;
    }
}

export const defaultClock = new RealClock();
