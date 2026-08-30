export function validateRFC(rfc: string): boolean {
  const regex = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/i;
  return regex.test(rfc);
}

export function validateCURP(curp: string): boolean {
  const regex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z\d]\d$/i;
  return regex.test(curp);
}

export function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/[<>]/g, '');
}

export function generateId(): string {
  return crypto.randomUUID();
}
