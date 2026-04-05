export default {
  formatDate: (date: Date, format: string) => {
    const options: Intl.DateTimeFormatOptions = {};
    switch (format) {
      case 'short':
        options.year = '2-digit';
        options.month = '2-digit';
        options.day = '2-digit';
        break;
      case 'long':
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'time':
        options.hour = '2-digit';
        options.minute = '2-digit';
        options.second = '2-digit';
        break;
      default:
        options.year = 'numeric';
        options.month = '2-digit';
        options.day = '2-digit';
    }
    return new Intl.DateTimeFormat('en-US', options).format(date);
  },
  uppercase: (str: string) => str.toUpperCase(),
  lowercase: (str: string) => str.toLowerCase(),
  eq: (a, b) => a === b,
  json: (ctx) => JSON.stringify(ctx, null, 2),
  // Add more helpers as needed
};
