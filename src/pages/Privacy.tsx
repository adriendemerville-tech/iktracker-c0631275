import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Politique de confidentialité</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground">
              Ik Tracker s'engage à protéger la vie privée de ses utilisateurs. Cette politique de confidentialité 
              explique comment nous collectons, utilisons et protégeons vos informations personnelles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Données collectées</h2>
            <p className="text-muted-foreground">Nous collectons les informations suivantes :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Adresse e-mail (pour l'authentification)</li>
              <li>Informations sur vos véhicules (puissance fiscale, immatriculation)</li>
              <li>Données de trajets (adresses de départ et d'arrivée, distances)</li>
              <li>Préférences de l'application</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Utilisation des données</h2>
            <p className="text-muted-foreground">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Calculer vos indemnités kilométriques</li>
              <li>Générer des rapports de déplacements</li>
              <li>Améliorer l'expérience utilisateur</li>
              <li>Vous envoyer des notifications importantes liées au service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Stockage et sécurité</h2>
            <p className="text-muted-foreground">
              Vos données sont stockées de manière sécurisée sur des serveurs protégés. 
              Nous utilisons le chiffrement et d'autres mesures de sécurité pour protéger vos informations 
              contre tout accès non autorisé.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Partage des données</h2>
            <p className="text-muted-foreground">
              Nous ne vendons, n'échangeons ni ne transférons vos informations personnelles à des tiers, 
              sauf si cela est nécessaire pour fournir nos services ou si la loi l'exige.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Vos droits</h2>
            <p className="text-muted-foreground">Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement (droit à l'oubli)</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition au traitement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Cookies</h2>
            <p className="text-muted-foreground">
              Nous utilisons des cookies essentiels pour le fonctionnement de l'application, 
              notamment pour maintenir votre session de connexion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits, 
              veuillez nous contacter via le formulaire de feedback dans l'application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Modifications</h2>
            <p className="text-muted-foreground">
              Nous nous réservons le droit de modifier cette politique de confidentialité à tout moment. 
              Les modifications seront publiées sur cette page avec une date de mise à jour.
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacy;
