export default function validateInput(value: string, minLength: number): boolean {
    return value.length >= minLength;
  }