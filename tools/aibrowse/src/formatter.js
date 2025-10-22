/**
 * JSON output formatter
 */

export function formatOutput(command, result, session = null) {
  const output = {
    status: 'ok',
    command,
    result
  };

  if (session) {
    output.meta = session.getMeta();
  }

  return JSON.stringify(output, null, 2);
}

export function formatError(command, error, code = null) {
  const output = {
    status: 'error',
    command,
    error: error.message || error,
    code: code || error.code || 'UNKNOWN_ERROR'
  };

  return JSON.stringify(output, null, 2);
}
