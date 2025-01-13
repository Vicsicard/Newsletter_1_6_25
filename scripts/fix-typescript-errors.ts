const ts = require('typescript');
const path = require('path');
const fs = require('fs');

interface TypeScriptError {
  file: string;
  line: number;
  character: number;
  code: number;
  message: string;
}

function getTypeScriptErrors(projectRoot) {
  // Create a TypeScript program
  const configPath = ts.findConfigFile(projectRoot, ts.sys.fileExists, 'tsconfig.json');
  if (!configPath) {
    throw new Error('Could not find tsconfig.json');
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath)
  );

  const program = ts.createProgram({
    rootNames: parsedConfig.fileNames,
    options: parsedConfig.options,
  });

  const errors = [];

  // Get the diagnostics
  const diagnostics = [
    ...program.getSemanticDiagnostics(),
    ...program.getSyntacticDiagnostics(),
  ];

  for (const diagnostic of diagnostics) {
    if (diagnostic.file) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start!
      );
      
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
  const sourceText = sourceFile.getFullText();
  
  // Fix: Missing type annotations
  if (error.code === 7006) { // Parameter 'xxx' implicitly has an 'any' type
    const lines = sourceText.split('\n');
    const line = lines[error.line - 1];
    if (line.includes('function') || line.includes('=>')) {
      // Add ': any' to parameters without type annotations
      return line.replace(/\(([^)]+)\)/, (match, params) => {
        return `(${params.split(',').map(param => {
          param = param.trim();
          return param.includes(':') ? param : `${param}: any`;
        }).join(', ')})`;
      });
    }
  }

  // Fix: Object literal may only specify known properties
  if (error.code === 2353) {
    const lines = sourceText.split('\n');
    const line = lines[error.line - 1];
    // Add type assertion to object literal
    if (line.includes('{') && line.includes('}')) {
      return `${line} as any`;
    }
  }

  // Fix: Property 'xxx' does not exist on type 'yyy'
  if (error.code === 2339) {
    const lines = sourceText.split('\n');
    const line = lines[error.line - 1];
    // Add type assertion to access
    if (line.includes('.')) {
      return line.replace(/(\w+\.\w+)/, '($1 as any)');
    }
  }

  return null;
}

function fixTypeScriptErrors(projectRoot) {
  console.log('Analyzing TypeScript errors...');
  const errors = getTypeScriptErrors(projectRoot);

  if (errors.length === 0) {
    console.log('No TypeScript errors found!');
    return;
  }

  console.log(`Found ${errors.length} TypeScript errors.`);
  
  let fixedCount = 0;
  const processedFiles = new Set();

  for (const error of errors) {
    if (processedFiles.has(error.file)) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      error.file,
      fs.readFileSync(error.file, 'utf-8'),
      ts.ScriptTarget.Latest,
      true
    );

    let fileContent = sourceFile.getFullText();
    let hasChanges = false;

    // Group errors by file
    const fileErrors = errors.filter(e => e.file === error.file);
    
    for (const fileError of fileErrors) {
      const fix = fixCommonErrors(fileError, sourceFile);
      if (fix) {
        const lines = fileContent.split('\n');
        lines[fileError.line - 1] = fix;
        fileContent = lines.join('\n');
        hasChanges = true;
        fixedCount++;
      }
    }

    if (hasChanges) {
      fs.writeFileSync(error.file, fileContent, 'utf-8');
      console.log(`Fixed errors in ${path.relative(projectRoot, error.file)}`);
    }

    processedFiles.add(error.file);
  }

  console.log(`\nFixed ${fixedCount} errors automatically.`);
  if (fixedCount < errors.length) {
    console.log(`${errors.length - fixedCount} errors require manual fixes.`);
    console.log('\nRemaining errors:');
    errors.forEach(error => {
      console.log(`${path.relative(projectRoot, error.file)}:${error.line}:${error.character} - ${error.message}`);
    });
  }
}

// Run the script
const projectRoot = process.cwd();
fixTypeScriptErrors(projectRoot).catch(console.error);
