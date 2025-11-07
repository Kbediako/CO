'use client';

import { Button, Card } from '@starter/ui';
import { motion } from 'framer-motion';

export default function Page() {
  return (
    <main style={{ maxWidth: 960, margin: '2rem auto', padding: '1rem' }}>
      <h1>On‑Brand UI Demo</h1>
      <p>This page consumes CSS variables generated from extracted tokens.</p>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <h3>Card</h3>
          <p>Tokens drive spacing, corner radii, shadows and colors.</p>
          <Button>Primary</Button>
        </Card>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
          <Card>
            <h3>Motion</h3>
            <p>Motion primitives follow the same tokenized easing + duration once mapped.</p>
            <Button variant="ghost">Ghost</Button>
          </Card>
        </motion.div>
      </section>
    </main>
  );
}
