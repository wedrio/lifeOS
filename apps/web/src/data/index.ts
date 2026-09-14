import type { DataSource } from '@lifeos/shared';
import { MockDataSource } from './mock/MockDataSource';

/**
 * Single data entry point for all UI code. Stage A uses local MockDataSource;
 * the Stage B RemoteDataSource will be selected here without changing pages.
 */
const mockDataSource = new MockDataSource();
export const dataSource: DataSource = mockDataSource;

/** Development-only helper required by the Mock-first acceptance flow. */
export const generateDemoData = () => mockDataSource.generateDemoData();

export { MockDataSource, resetMockData } from './mock/MockDataSource';
