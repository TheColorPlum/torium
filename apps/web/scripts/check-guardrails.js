#!/usr/bin/env node

/**
 * CI Guardrails for Torium Design System
 * 
 * Checks for forbidden patterns to prevent UI slop.
 * Run: node ./scripts/check-guardrails.js
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FORBIDDEN_PATTERNS = [
  {
    pattern: 'transition-all',
    message: 'Use specific transitions (e.g., transition-colors duration-150)',
  },
  {
    pattern: 'bg-gradient-',
    message: 'No gradients allowed (except landing hero)',
    exceptions: ['components/landing/hero.tsx'],
  },
  {
    pattern: 'rounded-xl',
    message: 'Use rounded-sm (6px) or rounded-md (10px) only',
  },
  {
    pattern: 'rounded-2xl',
    message: 'Use rounded-sm (6px) or rounded-md (10px) only',
  },
  {
    pattern: 'rounded-full',
    message: 'Only allowed for avatars and small decorative elements',
    exceptions: ['avatar', 'dashboard/layout.tsx', 'hero.tsx', 'sidebar-nav.tsx'],
  },
  {
    pattern: 'shadow-xl',
    message: 'Only shadow-modal is allowed',
  },
  {
    pattern: 'shadow-2xl',
    message: 'Only shadow-modal is allowed',
  },
  {
    pattern: 'animate-',
    message: 'No built-in animations. Use transition-colors duration-150/180',
    exceptions: ['animate-spin'], // loading spinners allowed
  },
  {
    pattern: 'bg-accent-500/10',
    message: 'No accent background washes (except feature icons)',
    exceptions: ['page.tsx'], // landing page feature icons
  },
];

const PROTECTED_FILES = [
  'packages/shared/src/ui/tokens.ts',
  'apps/web/tailwind.config.ts',
];

// Colors
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function findFiles(dir, extensions) {
  const results = [];
  const list = fs.readdirSync(dir);
  
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.next') {
      results.push(...findFiles(filePath, extensions));
    } else if (extensions.some(ext => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  
  return results;
}

function checkForbiddenPatterns() {
  const webDir = path.join(__dirname, '..');
  const files = findFiles(webDir, ['.tsx', '.ts', '.css']);
  const violations = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(webDir, file);
    const lines = content.split('\n');

    for (const rule of FORBIDDEN_PATTERNS) {
      // Check if file is in exceptions
      if (rule.exceptions?.some(exc => relativePath.includes(exc))) {
        continue;
      }

      lines.forEach((line, index) => {
        if (line.includes(rule.pattern)) {
          violations.push({
            file: relativePath,
            line: index + 1,
            pattern: rule.pattern,
            message: rule.message,
          });
        }
      });
    }
  }

  return violations;
}

function checkTokenIntegrity() {
  const tokensPath = path.join(__dirname, '../../..', 'packages/shared/src/ui/tokens.ts');
  
  if (!fs.existsSync(tokensPath)) {
    return { valid: false, error: 'Token file not found' };
  }

  const content = fs.readFileSync(tokensPath, 'utf-8');
  
  // Check accent color is exactly #8E4585
  if (!content.includes("500: '#8E4585'")) {
    return { valid: false, error: 'Accent color must be exactly #8E4585' };
  }

  return { valid: true };
}

function main() {
  console.log('🔍 Checking Torium design guardrails...\n');

  let hasErrors = false;

  // Check forbidden patterns
  const violations = checkForbiddenPatterns();
  
  if (violations.length > 0) {
    console.log(`${RED}❌ Found ${violations.length} forbidden pattern(s):${RESET}\n`);
    
    for (const v of violations) {
      console.log(`  ${v.file}:${v.line}`);
      console.log(`    Pattern: ${YELLOW}${v.pattern}${RESET}`);
      console.log(`    ${v.message}\n`);
    }
    
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓ No forbidden patterns found${RESET}`);
  }

  // Check token integrity
  const tokenCheck = checkTokenIntegrity();
  
  if (!tokenCheck.valid) {
    console.log(`${RED}❌ Token integrity check failed: ${tokenCheck.error}${RESET}`);
    hasErrors = true;
  } else {
    console.log(`${GREEN}✓ Token integrity verified${RESET}`);
  }

  console.log('');

  if (hasErrors) {
    console.log(`${RED}CI guardrails failed. Fix violations before merging.${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}All guardrails passed!${RESET}`);
    process.exit(0);
  }
}

main();
