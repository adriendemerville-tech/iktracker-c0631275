// Pure CSS loading screen - NO framer-motion to keep initial bundle small
// Animations use CSS keyframes instead of JS for better performance

export const AuthLoadingScreen = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Logo with CSS fade-in */}
      <img
        src="/logo-iktracker-250.webp"
        alt="IK Tracker"
        className="w-16 h-16 mb-8 animate-fade-in"
        style={{ animationDuration: '0.4s', animationFillMode: 'both' }}
      />
      
      {/* Spinning loader with pure CSS */}
      <div 
        className="relative animate-fade-in"
        style={{ animationDelay: '0.2s', animationDuration: '0.3s', animationFillMode: 'both' }}
      >
        {/* Outer ring */}
        <div className="w-12 h-12 rounded-full border-2 border-muted" />
        
        {/* Spinning arc - CSS animation */}
        <div
          className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary animate-spin"
        />
      </div>
      
      {/* Subtle text with CSS fade */}
      <p
        className="mt-6 text-sm text-muted-foreground animate-fade-in"
        style={{ animationDelay: '0.4s', animationDuration: '0.3s', animationFillMode: 'both' }}
      >
        Chargement...
      </p>
    </div>
  );
};
