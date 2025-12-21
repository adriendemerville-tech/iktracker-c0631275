import { motion, AnimatePresence } from 'framer-motion';

interface LogoutOverlayProps {
  isVisible: boolean;
}

export const LogoutOverlay = ({ isVisible }: LogoutOverlayProps) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/85 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              À bientôt !
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
