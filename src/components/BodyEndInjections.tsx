import { useState, useEffect } from 'react';

interface Injection {
  id: string;
  content: string;
  location: string;
  is_active: boolean;
}

const BodyEndInjections = () => {
  const [html, setHtml] = useState('');

  useEffect(() => {
    fetch('https://tutlimtasnjabdfhpewu.supabase.co/functions/v1/iktracker-actions?action=get-injections&location=body_end')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        const injections = data?.injections || data?.result?.data?.data || data?.result?.data;
        if (!Array.isArray(injections) || !injections.length) return;
        setHtml(
          injections
            .filter((i: Injection) => i.is_active)
            .map((i: Injection) => i.content)
            .join('')
        );
      })
      .catch(() => {});
  }, []);

  if (!html) return null;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
};

export default BodyEndInjections;
