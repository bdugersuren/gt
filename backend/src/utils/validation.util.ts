/**
 * Validates a Mongolian Registration Number (Регистрийн дугаар).
 * Format: 2 Cyrillic letters followed by 8 digits.
 * Example: АЕ06231234
 */
export function validateMongolianRegisterNumber(regNo: string): boolean {
  if (!regNo) return false;
  
  // Regex matches exactly 2 Cyrillic characters (including Ө, Ү, Ё, case-insensitive) and 8 digits
  const regex = /^[А-ЯӨҮЁа-яөүё]{2}\d{8}$/;
  return regex.test(regNo.trim());
}
