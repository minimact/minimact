"use strict";
/**
 * @minimact/swig-shared
 *
 * Shared services for Minimact Swig (Electron GUI and CLI)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AVAILABLE_MODULES = exports.ModuleManager = exports.HookExampleGenerator = exports.FileWatcher = exports.TranspilerService = exports.ProjectManager = void 0;
var ProjectManager_1 = require("./ProjectManager");
Object.defineProperty(exports, "ProjectManager", { enumerable: true, get: function () { return ProjectManager_1.ProjectManager; } });
var TranspilerService_1 = require("./TranspilerService");
Object.defineProperty(exports, "TranspilerService", { enumerable: true, get: function () { return TranspilerService_1.TranspilerService; } });
var FileWatcher_1 = require("./FileWatcher");
Object.defineProperty(exports, "FileWatcher", { enumerable: true, get: function () { return FileWatcher_1.FileWatcher; } });
var HookExampleGenerator_1 = require("./HookExampleGenerator");
Object.defineProperty(exports, "HookExampleGenerator", { enumerable: true, get: function () { return HookExampleGenerator_1.HookExampleGenerator; } });
var ModuleManager_1 = require("./ModuleManager");
Object.defineProperty(exports, "ModuleManager", { enumerable: true, get: function () { return ModuleManager_1.ModuleManager; } });
Object.defineProperty(exports, "AVAILABLE_MODULES", { enumerable: true, get: function () { return ModuleManager_1.AVAILABLE_MODULES; } });
