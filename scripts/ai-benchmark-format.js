'use strict';

const formats = {
  beginner: {pool: 'documentation/corp-ai-regression/assets/beginner-pool.json', bench: 'bench'},
  startup: {pool: 'tests/fixtures/ai-batch/deck-pool-startup-format.json', bench: 'bench/startup'},
};

function benchmarkFormat(format = 'beginner') {
  if (!Object.hasOwn(formats, format)) {
    throw new Error(`Unknown benchmark format: ${format}. Choose beginner or startup.`);
  }
  return formats[format];
}

function parseFormat(args, script) {
  if (!args.length) return 'beginner';
  if (args.length === 2 && args[0] === '--format') {
    benchmarkFormat(args[1]);
    return args[1];
  }
  throw new Error(`Usage: node scripts/${script} [--format beginner|startup]`);
}

module.exports = {benchmarkFormat, parseFormat};
