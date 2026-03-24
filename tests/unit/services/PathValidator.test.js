"use strict";
/**
 * PathValidator Unit Tests
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const PathValidator_1 = require("../../../src/main/services/PathValidator");
const ErrorHandler_1 = require("../../../src/main/utils/ErrorHandler");
describe('PathValidator', () => {
    const projectDir = '/Users/test/project/.claude/skills';
    const globalDir = '/Users/test/.claude/skills';
    let validator;
    beforeEach(() => {
        validator = new PathValidator_1.PathValidator(projectDir, globalDir);
    });
    describe('validate', () => {
        it('should allow paths within project directory', () => {
            const skillPath = path_1.default.join(projectDir, 'my-skill');
            expect(() => validator.validate(skillPath)).not.toThrow();
        });
        it('should allow paths within global directory', () => {
            const skillPath = path_1.default.join(globalDir, 'my-skill');
            expect(() => validator.validate(skillPath)).not.toThrow();
        });
        it('should reject path traversal attempts outside allowed directories', () => {
            const maliciousPath = '/etc/passwd';
            expect(() => validator.validate(maliciousPath)).toThrow(ErrorHandler_1.PathTraversalError);
        });
        it('should reject relative path escape attempts', () => {
            const maliciousPath = path_1.default.join(projectDir, '..', '..', 'secrets');
            expect(() => validator.validate(maliciousPath)).toThrow(ErrorHandler_1.PathTraversalError);
        });
        it('should resolve relative paths and validate them', () => {
            const relativePath = './my-skill';
            const absolutePath = path_1.default.resolve(relativePath);
            // Should throw because it's not in allowed directories
            expect(() => validator.validate(relativePath)).toThrow(ErrorHandler_1.PathTraversalError);
        });
        it('should allow exact match of allowed directory', () => {
            expect(() => validator.validate(projectDir)).not.toThrow();
            expect(() => validator.validate(globalDir)).not.toThrow();
        });
    });
    describe('isWithinAllowedDir', () => {
        it('should return true for valid paths', () => {
            const skillPath = path_1.default.join(projectDir, 'my-skill');
            expect(validator.isWithinAllowedDir(skillPath)).toBe(true);
        });
        it('should return false for invalid paths', () => {
            const maliciousPath = '/etc/passwd';
            expect(validator.isWithinAllowedDir(maliciousPath)).toBe(false);
        });
    });
    describe('getAllowedDirectories', () => {
        it('should return all allowed directories', () => {
            const allowed = validator.getAllowedDirectories();
            expect(allowed).toContain(path_1.default.resolve(projectDir));
            expect(allowed).toContain(path_1.default.resolve(globalDir));
            expect(allowed).toHaveLength(2);
        });
    });
    describe('with null project directory', () => {
        it('should only allow global directory', () => {
            const validatorNoProject = new PathValidator_1.PathValidator(null, globalDir);
            const allowed = validatorNoProject.getAllowedDirectories();
            expect(allowed).toHaveLength(1);
            expect(allowed).toContain(path_1.default.resolve(globalDir));
        });
    });
});
//# sourceMappingURL=PathValidator.test.js.map