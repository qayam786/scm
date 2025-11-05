export function toMillis(timestamp: number): number {
  // If timestamp is in seconds (10 digits), convert to milliseconds
  if (timestamp < 10000000000) {
    return timestamp * 1000;
  }
  return timestamp;
}

 //Format timestamp to local date string
 
export function formatLocalDate(timestamp: number): string {
  const millis = toMillis(timestamp);
  const date = new Date(millis);
  
  // Return in format: Jan 15, 2024
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}


//Format timestamp to local date and time string

export function formatLocalDateTime(timestamp: number): string {
  const millis = toMillis(timestamp);
  const date = new Date(millis);
  
  // Return in format: Jan 15, 2024, 3:30 PM
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}