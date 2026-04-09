
UPDATE blog_posts 
SET content = content || E'\n\n---\n\n## 📊 Consultez le barème kilométrique 2026\n\nRetrouvez le tableau officiel des indemnités kilométriques 2026, un simulateur gratuit et toutes les explications pour calculer vos IK selon votre puissance fiscale.\n\n[Consulter le barème IK 2026 →](/bareme-ik-2026)\n',
    updated_at = now()
WHERE slug = 'indemnites-kilometriques-consultant-independant';

UPDATE blog_posts 
SET content = content || E'\n\n---\n\n## 📊 Barème kilométrique 2026 : simulez vos IK\n\nAvant de finaliser votre rapport, vérifiez vos montants avec le barème officiel 2026. Notre simulateur gratuit calcule instantanément vos indemnités selon votre véhicule et vos kilomètres.\n\n[Accéder au simulateur IK 2026 →](/bareme-ik-2026)\n',
    updated_at = now()
WHERE slug = 'etapes-rapport-kilometrique';
