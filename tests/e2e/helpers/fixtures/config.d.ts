/**
 * Test Fixtures - Sample Configuration Data
 *
 * Provides sample configurations for testing
 */
import type { Configuration, SkillEditorConfig, PrivateRepo, AIConfiguration } from '../../../shared/types';
/**
 * Sample skill editor configuration
 */
export declare const sampleEditorConfig: SkillEditorConfig;
/**
 * Sample AI configuration
 */
export declare const sampleAIConfig: AIConfiguration;
/**
 * Sample private repository configuration
 */
export declare const samplePrivateRepos: PrivateRepo[];
/**
 * Sample full configuration
 */
export declare const sampleConfig: Configuration;
/**
 * Minimal configuration (no AI, no private repos)
 */
export declare const minimalConfig: Configuration;
/**
 * Configuration without project directories (initial state)
 */
export declare const emptyConfig: Partial<Configuration>;
/**
 * Generate test configuration with custom directories
 */
export declare function generateTestConfig(directories: string[]): Configuration;
/**
 * Invalid configuration for error testing
 */
export declare const invalidConfig: {
    projectDirectories: string[];
    skillEditorConfig: {
        fontSize: number;
        theme: string;
    };
};
/**
 * Migration test data
 */
export declare const migrationTestData: {
    oldConfigPath: string;
    newConfigPath: string;
    skillsToMigrate: {
        name: string;
        path: string;
    }[];
};
/**
 * Editor themes for testing
 */
export declare const editorThemes: readonly ["light", "dark", "vs-dark"];
/**
 * Font sizes for testing
 */
export declare const fontSizes: number[];
/**
 * Tab sizes for testing
 */
export declare const tabSizes: number[];
/**
 * Auto-save delays for testing (in ms)
 */
export declare const autoSaveDelays: number[];
//# sourceMappingURL=config.d.ts.map