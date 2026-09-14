import type { DataSource } from '@lifeos/shared';
import { MockDataSource } from './mock/MockDataSource';

/**
 * Single data entry point for all UI code. Stage A uses local MockDataSource;
 * the Stage B RemoteDataSource will be selected here without changing pages.
 */
export const dataSource: DataSource = new MockDataSource();

export { MockDataSource, resetMockData } from './mock/MockDataSource';
