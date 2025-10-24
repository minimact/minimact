/**
 * Module Hijacker for Visual Compiler
 *
 * Intercepts Node.js module loading to replace React with our deterministic shim
 * This allows us to analyze real React components with controlled state
 */
import Module from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { resetMockState, injectState, injectContext } from './react-shim.js';
// ES modules compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Type assertion for Module._load
const ModuleType = Module;
export class ModuleHijacker {
    constructor(config = {}) {
        this.isActive = false;
        this.originalLoad = ModuleType._load;
        this.config = {
            targetModules: {
                'react': path.resolve(__dirname, './react-shim.js'),
                'react/jsx-runtime': path.resolve(__dirname, './jsx-runtime-shim.js'),
                'react/jsx-dev-runtime': path.resolve(__dirname, './jsx-runtime-shim.js'),
                ...config.targetModules
            },
            enableLogging: config.enableLogging || false
        };
    }
    /**
     * Start hijacking module imports
     */
    activate() {
        if (this.isActive)
            return;
        const self = this;
        ModuleType._load = function (request, parent, isMain) {
            // Check if this is a module we want to hijack
            if (self.config.targetModules[request]) {
                if (self.config.enableLogging) {
                    console.log(`🔄 Hijacking import: ${request} -> ${self.config.targetModules[request]}`);
                }
                // Load our shim instead
                return self.originalLoad.call(this, self.config.targetModules[request], parent, isMain);
            }
            // For FailSquare-specific hooks, also redirect to our shims
            if (request.includes('useAuth') || request.includes('useTabNavigation')) {
                if (self.config.enableLogging) {
                    console.log(`🔄 Hijacking FailSquare hook: ${request}`);
                }
                return self.originalLoad.call(this, path.resolve(__dirname, './react-shim.js'), parent, isMain);
            }
            // Otherwise use original loading
            return self.originalLoad.call(this, request, parent, isMain);
        };
        this.isActive = true;
        if (this.config.enableLogging) {
            console.log('✅ Module hijacker activated');
        }
    }
    /**
     * Stop hijacking and restore original module loading
     */
    deactivate() {
        if (!this.isActive)
            return;
        ModuleType._load = this.originalLoad;
        this.isActive = false;
        if (this.config.enableLogging) {
            console.log('⏹️  Module hijacker deactivated');
        }
    }
    /**
     * Check if hijacker is currently active
     */
    isActivated() {
        return this.isActive;
    }
    /**
     * Setup mock environment for a specific test scenario
     */
    setupMockEnvironment(scenario, customData) {
        resetMockState();
        const baseUser = {
            id: 'user-123',
            email: 'researcher@failsquare.com',
            username: 'quantum_researcher',
            displayName: 'Dr. Alice Chen',
            meritScore: 1247,
            totalFailures: 23
        };
        const baseAuth = {
            user: baseUser,
            isAuthenticated: true,
            login: () => Promise.resolve(true),
            logout: () => Promise.resolve(),
            register: () => Promise.resolve(true)
        };
        // Inject auth context
        injectContext('AuthContext', baseAuth);
        // Inject navigation context
        injectContext('TabNavigationContext', {
            activeTab: scenario,
            tabs: [
                { id: 'dashboard', title: 'Dashboard', path: '/dashboard', closable: false }
            ],
            navigateToTab: (path, title) => {
                console.log(`[Mock Navigation] ${title} -> ${path}`);
            },
            closeTab: () => { }
        });
        // Scenario-specific state injection
        switch (scenario) {
            case 'dashboard':
                injectState('failures-list', [
                    { id: '1', title: 'Quantum Entanglement Issue', domain: 'Quantum Computing' },
                    { id: '2', title: 'Neural Network Convergence', domain: 'Machine Learning' }
                ]);
                injectState('user-stats', {
                    totalFailures: 127,
                    thisMonth: 8,
                    meritScore: 1247
                });
                break;
            case 'profile':
                injectState('profile-data', {
                    ...baseUser,
                    bio: 'Quantum computing researcher focusing on distributed quantum systems',
                    achievements: ['High Merit', 'Consistency Award'],
                    joinDate: '2024-03-01'
                });
                break;
            case 'submit':
                injectState('form-data', {
                    title: '',
                    domain: '',
                    problemStatement: '',
                    currentStep: 0
                });
                break;
            case 'custom':
                if (customData) {
                    Object.entries(customData).forEach(([key, value]) => {
                        injectState(key, value);
                    });
                }
                break;
        }
        if (this.config.enableLogging) {
            console.log(`🧪 Mock environment setup for: ${scenario}`);
        }
    }
    /**
     * Inject specific state for testing
     */
    injectTestState(key, value) {
        injectState(key, value);
    }
    /**
     * Inject specific context for testing
     */
    injectTestContext(key, value) {
        injectContext(key, value);
    }
}
// Global instance for easy access
export const moduleHijacker = new ModuleHijacker({
    enableLogging: true
});
/**
 * Convenience function to run code with hijacked modules
 */
export async function withHijackedModules(scenario, fn, customData) {
    moduleHijacker.activate();
    moduleHijacker.setupMockEnvironment(scenario, customData);
    try {
        const result = await fn();
        return result;
    }
    finally {
        moduleHijacker.deactivate();
    }
}
