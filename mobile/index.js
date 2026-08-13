// Initialise le collecteur natif avant Expo Router afin de voir aussi les
// erreurs qui surviennent avant le montage du premier écran React.
// Il reste optionnel : son absence ou son échec ne doit jamais bloquer l'app.
try {
  require('./src/lib/monitoring');
} catch (error) {
  console.warn('[startup] monitoring unavailable', error);
}
require('expo-router/entry');