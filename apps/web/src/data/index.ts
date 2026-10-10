import type { DataSource } from '@lifeos/shared';
import { MockDataSource } from './mock/MockDataSource';
import { RemoteDataSource } from './remote/RemoteDataSource';

/**
 * Single data entry point for all UI code.
 * Stage B 渐进迁移：`VITE_DATA_SOURCE=remote` 时使用 RemoteDataSource——
 * 已迁移的仓储走远程 API，尚未迁移的仓储回退到本地 Mock，页面零改动。
 */
const mockDataSource = new MockDataSource();
export const isRemoteMode = (import.meta.env.VITE_DATA_SOURCE ?? 'mock') === 'remote';
export const dataSource: DataSource = isRemoteMode ? new RemoteDataSource(mockDataSource) : mockDataSource;

/** Development-only helper required by the Mock-first acceptance flow（仅作用于本地 Mock 实例）。 */
export const generateDemoData = () => mockDataSource.generateDemoData();
export const generateDisciplineDemoData = () => mockDataSource.generateDisciplineDemoData();
export const generateReadingDemoData = () => mockDataSource.generateReadingDemoData();
export const generateAssetsDemoData = () => mockDataSource.generateAssetsDemoData();
export const generateMomentsDemoData = () => mockDataSource.generateMomentsDemoData();
export const generateSeedsDemoData = () => mockDataSource.generateSeedsDemoData();
export const generateAllDemoData = () => mockDataSource.generateAllDemoData();

export { MockDataSource, resetMockData } from './mock/MockDataSource';
