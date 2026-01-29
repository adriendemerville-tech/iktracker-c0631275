import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Building2, Linkedin, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { EnhancedMarketingFooter } from '@/components/marketing/EnhancedMarketingFooter';
const founderPhoto = '/founder-adrien.jpg';

export default function AuthorPage() {
  const canonicalUrl = 'https://iktracker.fr/blog/auteur/adrien-de-volontat';

  // JSON-LD structured data for Person
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": "Adrien de Volontat",
    "jobTitle": "Fondateur",
    "worksFor": {
      "@type": "Organization",
      "name": "Avenir Rénovations",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Saint-Rémy-de-Provence",
        "addressCountry": "FR"
      }
    },
    "description": "Dirigeant de l'agence Avenir Rénovations et créateur d'IKtracker, outil de suivi des indemnités kilométriques.",
    "sameAs": [
      "https://www.linkedin.com/in/adrien-de-volontat"
    ]
  };

  return (
    <>
      <Helmet>
        <title>Adrien de Volontat - Fondateur IKtracker | Blog</title>
        <meta name="description" content="Découvrez Adrien de Volontat, fondateur d'IKtracker et dirigeant d'Avenir Rénovations à Saint-Rémy-de-Provence. Un outil créé par un professionnel pour les professionnels." />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content="Adrien de Volontat - Fondateur IKtracker" />
        <meta property="og:description" content="Découvrez le créateur d'IKtracker, outil de suivi des indemnités kilométriques." />
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="profile:first_name" content="Adrien" />
        <meta property="profile:last_name" content="de Volontat" />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(personSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-12 max-w-3xl">
          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="mb-6">
            <ol className="flex items-center gap-2 text-sm text-muted-foreground">
              <li><Link to="/" className="hover:text-primary transition-colors">Accueil</Link></li>
              <li>/</li>
              <li><Link to="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li>/</li>
              <li className="text-foreground font-medium">Auteur</li>
            </ol>
          </nav>

          <Link 
            to="/blog" 
            className="inline-flex items-center text-primary hover:underline text-sm mb-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour au blog
          </Link>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent h-32" />
              
              {/* Author info */}
              <div className="px-6 pb-8 -mt-16">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  {/* Avatar */}
                  <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
                    <AvatarImage 
                      src={founderPhoto} 
                      alt="Adrien de Volontat" 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl font-bold">AV</AvatarFallback>
                  </Avatar>
                  
                  {/* Name and title */}
                  <div className="flex-1 pt-4 md:pt-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      Adrien de Volontat
                    </h1>
                    <p className="text-lg text-primary font-medium mb-3">
                      Fondateur d'IKtracker
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Avenir Rénovations
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        Saint-Rémy-de-Provence
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div className="mt-8 space-y-4 text-foreground/90 leading-relaxed">
                  <p>
                    <strong>Dirigeant de l'agence Avenir Rénovations</strong> à Saint-Rémy-de-Provence, 
                    je n'ai trouvé aucune solution techniquement satisfaisante pour automatiser 
                    le suivi de mes indemnités kilométriques.
                  </p>
                  <p>
                    J'ai donc fait développer <strong>IKtracker</strong> pour répondre à mes propres 
                    besoins de terrain. L'infrastructure étant en place et opérationnelle pour mon 
                    équipe, je la partage gratuitement avec la communauté.
                  </p>
                  <p className="text-muted-foreground italic">
                    Pas d'abonnement, pas de frais cachés, pas d'exploitation commerciale de vos données. 
                    Juste un outil professionnel créé par un professionnel pour les professionnels.
                  </p>
                </div>

                {/* CTA */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button asChild>
                    <Link to="/signup">
                      Essayer IKtracker gratuitement
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <a 
                      href="https://www.linkedin.com/in/adrien-de-volontat" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Linkedin className="mr-2 h-4 w-4" />
                      LinkedIn
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles section */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Articles de Adrien de Volontat
            </h2>
            <p className="text-muted-foreground">
              Retrouvez tous les articles rédigés par Adrien sur{' '}
              <Link to="/blog" className="text-primary hover:underline">
                le blog IKtracker
              </Link>.
            </p>
          </section>
        </main>
        
        <EnhancedMarketingFooter />
      </div>
    </>
  );
}
