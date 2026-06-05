export function formatDateTime(value?: string): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDate(value?: string): string {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(date);
}

export function formatTime(value?: string): string {
  if (!value) {
    return '--:--';
  }

  return value.slice(0, 5);
}

export function minutesToDuration(minutes?: number): string {
  if (!minutes || minutes < 1) {
    return '0 min';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} min`;
  }

  return `${hours} h ${remainingMinutes} min`;
}
