const MIN_PASSWORD_LENGTH = 8;

export function getPasswordStrength(password) {
  const normalizedPassword = String(password ?? "");
  if (!normalizedPassword) return null;

  const hasMixedCase = /[a-z]/.test(normalizedPassword) && /[A-Z]/.test(normalizedPassword);
  const hasNumber = /\d/.test(normalizedPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(normalizedPassword);

  const score = [
    normalizedPassword.length >= MIN_PASSWORD_LENGTH,
    hasMixedCase,
    hasNumber,
    hasSymbol,
    normalizedPassword.length >= 12,
  ].filter(Boolean).length;

  return score >= 4 ? "strong" : "weak";
}
