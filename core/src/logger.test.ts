import { LogLevel } from './types';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { forEach } from 'wonka';
import { makeLogger } from './logger';

beforeEach(() => {
    vi.useFakeTimers();
});

describe('makeLogger', () => {
    it('creates a ', () => {
        const { logger, logs } = makeLogger({ name: 'test' });
        const fn = vi.fn();

        forEach(fn)(logs);

        logger.log('msg');
        expect(fn).toHaveBeenCalledWith({ name: 'test', level: LogLevel.LOG, text: 'msg', values: {} });
    });
});
