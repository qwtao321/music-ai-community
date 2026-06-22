function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatNestedError(error: Record<string, unknown>) {
  const code = readString(error.code);
  const message =
    readString(error.message) ??
    readString(error.msg) ??
    readString(error.error_description);

  if (code && message) {
    return `${code}: ${message}`;
  }

  return message ?? code;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && readString(error.message)) {
    return error.message;
  }

  if (typeof error === "object" && error) {
    const nestedError = (error as { error?: unknown }).error;
    const message =
      readString((error as { message?: unknown }).message) ??
      readString((error as { msg?: unknown }).msg) ??
      readString((error as { error_description?: unknown }).error_description) ??
      (nestedError && typeof nestedError === "object"
        ? formatNestedError(nestedError as Record<string, unknown>)
        : null);

    if (message) {
      return message;
    }
  }

  return fallback;
}
