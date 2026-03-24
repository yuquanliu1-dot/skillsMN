"use strict";
/**
 * Tests for PrivateRepoService upload and source metadata update
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const PrivateRepoService_1 = require("../../../src/main/services/PrivateRepoService");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
// Mock the safeStorage module
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn(() => os.tmpdir()),
    },
    safeStorage: {
        encryptString: jest.fn((str) => Buffer.from(str)),
        decryptString: jest.fn((buf) => buf.toString()),
    },
}));
describe('PrivateRepoService - Upload and Source Update', () => {
    let tempDir;
    let skillDir;
    beforeEach(async () => {
        // Create temp directory for testing
        tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skill-test-'));
        skillDir = path.join(tempDir, 'test-skill');
        await fs.ensureDir(skillDir);
        // Create a SKILL.md file
        await fs.writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: Test Skill\ndescription: A test skill\n---\n\n# Test Skill\n\nThis is a test.', 'utf-8');
        // Create initial source metadata (registry)
        await fs.writeJson(path.join(skillDir, '.source.json'), {
            type: 'registry',
            registryUrl: 'https://skills.sh',
            source: 'public-org/public-repo',
            skillId: 'test-skill',
            installedAt: new Date().toISOString(),
            commitHash: 'abc123',
        });
    });
    afterEach(async () => {
        await fs.remove(tempDir);
    });
    describe('updateSkillSourceToPrivateRepo', () => {
        it('should update source metadata from registry to private-repo', async () => {
            // Initialize service
            await PrivateRepoService_1.PrivateRepoService.initialize();
            // Access private method via any cast for testing
            const service = PrivateRepoService_1.PrivateRepoService;
            // Mock repository object
            const mockRepo = {
                id: 'repo-123',
                owner: 'myorg',
                repo: 'myrepo',
                provider: 'github',
            };
            // Call the method
            await service.updateSkillSourceToPrivateRepo(skillDir, 'repo-123', mockRepo, 'test-skill', 'def456');
            // Verify the source metadata was updated
            const sourceMetadata = await fs.readJson(path.join(skillDir, '.source.json'));
            expect(sourceMetadata.type).toBe('private-repo');
            expect(sourceMetadata.repoId).toBe('repo-123');
            expect(sourceMetadata.repoPath).toBe('myorg/myrepo');
            expect(sourceMetadata.skillPath).toBe('test-skill');
            expect(sourceMetadata.commitHash).toBe('def456');
            expect(sourceMetadata.installedAt).toBeDefined();
        });
        it('should work without commit SHA', async () => {
            await PrivateRepoService_1.PrivateRepoService.initialize();
            const service = PrivateRepoService_1.PrivateRepoService;
            const mockRepo = {
                id: 'repo-456',
                owner: 'myorg',
                repo: 'myrepo',
                provider: 'github',
            };
            await service.updateSkillSourceToPrivateRepo(skillDir, 'repo-456', mockRepo, 'test-skill'
            // No commit SHA provided
            );
            const sourceMetadata = await fs.readJson(path.join(skillDir, '.source.json'));
            expect(sourceMetadata.type).toBe('private-repo');
            expect(sourceMetadata.repoId).toBe('repo-456');
            expect(sourceMetadata.commitHash).toBeUndefined();
        });
    });
});
//# sourceMappingURL=PrivateRepoUpload.test.js.map