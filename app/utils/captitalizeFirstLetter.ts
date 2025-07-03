/**
 * Converts a snake_case or SCREAMING_SNAKE_CASE string to PascalCase
 * @param str The string to convert
 * @returns The PascalCase version of the string
 */
export function capitalizeFirstLetter(str: string): string {
    return str
      .toLowerCase() // Convert entire string to lowercase first
      .split('_') // Split by underscores
      .map(word => 
        word.charAt(0).toUpperCase() + word.slice(1) // Capitalize first letter of each word
      )
      .join(''); // Join all words together
  }