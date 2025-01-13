"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var ts = __importStar(require("typescript"));
var path = __importStar(require("path"));
var fs = __importStar(require("fs"));
function getTypeScriptErrors(projectRoot) {
    // Create a TypeScript program
    var configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json');
    if (!configPath) {
        throw new Error('Could not find tsconfig.json');
    }
    var configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    var parsedConfig = ts.parseJsonConfigFileContent(configFile.config, ts.sys, path.dirname(configPath));
    var program = ts.createProgram({
        rootNames: parsedConfig.fileNames,
        options: parsedConfig.options,
    });
    var errors = [];
    // Get the diagnostics
    var diagnostics = __spreadArray(__spreadArray([], program.getSemanticDiagnostics(), true), program.getSyntacticDiagnostics(), true);
    for (var _i = 0, diagnostics_1 = diagnostics; _i < diagnostics_1.length; _i++) {
        var diagnostic = diagnostics_1[_i];
        if (diagnostic.file) {
            var _a = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start), line = _a.line, character = _a.character;
            errors.push({
                file: diagnostic.file.fileName,
                line: line + 1,
                character: character + 1,
                code: diagnostic.code,
                message: ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
            });
        }
    }
    return errors;
}
function fixCommonErrors(error, sourceFile) {
    var sourceText = sourceFile.getFullText();
    // Fix: Missing type annotations
    if (error.code === 7006) { // Parameter 'xxx' implicitly has an 'any' type
        var lines = sourceText.split('\n');
        var line = lines[error.line - 1];
        if (line.includes('function') || line.includes('=>')) {
            // Add ': any' to parameters without type annotations
            return line.replace(/\(([^)]+)\)/, function (match, params) {
                return "(".concat(params.split(',').map(function (param) {
                    param = param.trim();
                    return param.includes(':') ? param : "".concat(param, ": any");
                }).join(', '), ")");
            });
        }
    }
    // Fix: Object literal may only specify known properties
    if (error.code === 2353) {
        var lines = sourceText.split('\n');
        var line = lines[error.line - 1];
        // Add type assertion to object literal
        if (line.includes('{') && line.includes('}')) {
            return "".concat(line, " as any");
        }
    }
    // Fix: Property 'xxx' does not exist on type 'yyy'
    if (error.code === 2339) {
        var lines = sourceText.split('\n');
        var line = lines[error.line - 1];
        // Add type assertion to access
        if (line.includes('.')) {
            return line.replace(/(\w+\.\w+)/, '($1 as any)');
        }
    }
    return null;
}
function fixTypeScriptErrors(projectRoot) {
    return __awaiter(this, void 0, void 0, function () {
        var errors, fixedCount, processedFiles, _loop_1, _i, errors_1, error;
        return __generator(this, function (_a) {
            console.log('Analyzing TypeScript errors...');
            errors = getTypeScriptErrors(projectRoot);
            if (errors.length === 0) {
                console.log('No TypeScript errors found!');
                return [2 /*return*/];
            }
            console.log("Found ".concat(errors.length, " TypeScript errors."));
            fixedCount = 0;
            processedFiles = new Set();
            _loop_1 = function (error) {
                if (processedFiles.has(error.file)) {
                    return "continue";
                }
                var sourceFile = ts.createSourceFile(error.file, fs.readFileSync(error.file, 'utf-8'), ts.ScriptTarget.Latest, true);
                var fileContent = sourceFile.getFullText();
                var hasChanges = false;
                // Group errors by file
                var fileErrors = errors.filter(function (e) { return e.file === error.file; });
                for (var _b = 0, fileErrors_1 = fileErrors; _b < fileErrors_1.length; _b++) {
                    var fileError = fileErrors_1[_b];
                    var fix = fixCommonErrors(fileError, sourceFile);
                    if (fix) {
                        var lines = fileContent.split('\n');
                        lines[fileError.line - 1] = fix;
                        fileContent = lines.join('\n');
                        hasChanges = true;
                        fixedCount++;
                    }
                }
                if (hasChanges) {
                    fs.writeFileSync(error.file, fileContent, 'utf-8');
                    console.log("Fixed errors in ".concat(path.relative(projectRoot, error.file)));
                }
                processedFiles.add(error.file);
            };
            for (_i = 0, errors_1 = errors; _i < errors_1.length; _i++) {
                error = errors_1[_i];
                _loop_1(error);
            }
            console.log("\nFixed ".concat(fixedCount, " errors automatically."));
            if (fixedCount < errors.length) {
                console.log("".concat(errors.length - fixedCount, " errors require manual fixes."));
                console.log('\nRemaining errors:');
                errors.forEach(function (error) {
                    console.log("".concat(path.relative(projectRoot, error.file), ":").concat(error.line, ":").concat(error.character, " - ").concat(error.message));
                });
            }
            return [2 /*return*/];
        });
    });
}
// Run the script
var projectRoot = process.cwd();
fixTypeScriptErrors(projectRoot).catch(console.error);
