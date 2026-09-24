const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
export const formatPrice = (cents) => euros.format(cents / 100);
