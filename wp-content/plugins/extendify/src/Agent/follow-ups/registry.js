const cardContext = require.context('./cards', false, /\.js$/);
export const cards = cardContext.keys().map((key) => cardContext(key).default);
