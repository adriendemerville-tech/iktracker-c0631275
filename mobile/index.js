// Initialise le collecteur natif avant Expo Router afin de voir aussi les
// erreurs qui surviennent avant le montage du premier écran React.
require('./src/lib/monitoring');
require('expo-router/entry');