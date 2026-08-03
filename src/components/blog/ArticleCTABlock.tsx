import { Link } from '@/lib/router-compat';
import { Button } from '@/components/ui/button';
import { Calculator, Car } from 'lucide-react';

/**
 * Double CTA segmenté en fin d'article :
 *   - Salarié / particulier → calculer ses IK
 *   - Pro mobile / commercial / libéral → mode tournée
 */
export function ArticleCTABlock() {
  return (
    <aside className="my-12 rounded-2xl border border-border bg-muted/40 p-6 md:p-8">
      <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
        Passez à l'action
      </h2>
      <p className="text-muted-foreground mb-6">
        IKtracker est gratuit, sans carte bancaire. Choisissez le parcours qui vous correspond.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Salarié ou particulier</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4 flex-1">
            Calculez vos indemnités kilométriques 2026 selon le barème officiel et exportez votre relevé pour la déclaration de revenus.
          </p>
          <Link to="/bareme-ik-2026" className="mt-auto">
            <Button className="w-full">Calculer mes IK</Button>
          </Link>
        </div>
        <div className="rounded-xl border border-border bg-background p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Commercial, libéral, profession mobile</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4 flex-1">
            Démarrez votre tournée GPS automatique : IKtracker enregistre chaque arrêt et génère votre note de frais kilométrique.
          </p>
          <Link to="/signup" className="mt-auto">
            <Button variant="secondary" className="w-full">Créer un compte gratuit</Button>
          </Link>
        </div>
      </div>
    </aside>
  );
}
