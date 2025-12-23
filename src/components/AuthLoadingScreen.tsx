import { motion } from "framer-motion";

export const AuthLoadingScreen = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      {/* Logo */}
      <motion.img
        src="/logo-iktracker-250.webp"
        alt="IK Tracker"
        className="w-16 h-16 mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
      
      {/* Spinning loader */}
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {/* Outer ring */}
        <motion.div
          className="w-12 h-12 rounded-full border-2 border-muted"
        />
        
        {/* Spinning arc */}
        <motion.div
          className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-primary"
          animate={{ rotate: 360 }}
          transition={{
            duration: 1,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      </motion.div>
      
      {/* Subtle text */}
      <motion.p
        className="mt-6 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      >
        Chargement...
      </motion.p>
    </div>
  );
};
