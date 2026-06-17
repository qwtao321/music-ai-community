function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && readString(error.message)) {
    return error.message;
  }

  if (typeof error === "object" && error) {
    const message =
      readString((error as { message?: unknown }).message) ??
      readString((error as { msg?: unknown }).msg) ??
      readString((error as { error_description?: unknown }).error_description);

    if (message) {
      return message;
    }
  }

  return fallback;
}
