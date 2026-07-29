:root {
  --ink: #F2EFE9;
  --ink-dim: #8A9690;
  --ink-locked: #5A6560;
  --bg: #0F1613;
  --surface: #16201B;
  --surface-2: #1D2621;
  --border: #2A3A32;
  --accent: #E8A33D;
  --accent-ink: #0F1613;
  --green: #5FAD7A;
  --green-bg: rgba(95, 173, 122, 0.18);
  --red: #E2665F;
  --red-bg: rgba(226, 102, 95, 0.18);
  --font-display: 'Bebas Neue', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 15px;
}
.vue { min-height: 100vh; }

/* --- Connexion --- */
#vue-connexion { display: flex; align-items: center; justify-content: center; padding: 24px; }
.carte-login {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 28px 24px;
  width: 100%;
  max-width: 360px;
}
.carte-login h1 { font-family: var(--font-display); font-size: 30px; letter-spacing: 0.02em; margin: 0 0 2px; text-transform: uppercase; }
.sous-titre { color: var(--ink-dim); font-size: 13px; margin: 0 0 24px; font-family: var(--font-mono); }
label { display: block; font-size: 12px; color: var(--ink-dim); margin: 14px 0 6px; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--font-mono); }
select, input[type=password] {
  width: 100%;
  height: 40px;
  border-radius: 4px;
  border: 1px solid var(--border);
  padding: 0 12px;
  font-size: 14px;
  background: var(--surface-2);
  color: var(--ink);
  font-family: 'Inter', sans-serif;
}
.aide { font-size: 12px; color: var(--ink-dim); margin: 8px 0 0; line-height: 1.5; }
.btn-principal {
  width: 100%;
  height: 42px;
  border-radius: 4px;
  border: none;
  background: var(--accent);
  color: var(--accent-ink);
  font-family: var(--font-display);
  font-size: 16px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-top: 20px;
  cursor: pointer;
}
.btn-principal:active { opacity: 0.85; }
.erreur { color: var(--red); font-size: 13px; margin-top: 10px; min-height: 1em; }

/* --- App shell --- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}
#nom-joueur { font-size: 12px; color: var(--ink-dim); font-family: var(--font-mono); }
.onglets { display: flex; gap: 6px; }
.onglet {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  color: var(--ink-dim);
  cursor: pointer;
  font-family: var(--font-display);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.onglet.actif { background: var(--accent); color: var(--accent-ink); font-weight: 700; }
.lien { border: none; background: none; color: var(--accent); font-size: 13px; cursor: pointer; padding: 0; font-family: var(--font-mono); }
.lien-discret { color: var(--ink-dim); display: block; margin: 14px auto 0; text-align: center; }

.ecran { max-width: 480px; margin: 0 auto; padding: 20px 16px 40px; }
#bloc-admin-cible { margin-bottom: 12px; }
#bloc-admin-cible label { margin: 0 0 4px; }
#select-cible-admin { width: 100%; height: 38px; border-radius: 4px; border: 1px solid var(--border); padding: 0 10px; font-size: 13px; background: var(--surface-2); color: var(--ink); }
.carte { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }

.entete-journee { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid var(--border); }
.entete-journee button { border: none; background: none; font-size: 20px; color: var(--ink-dim); cursor: pointer; padding: 4px 10px; }
.titre-journee { text-align: center; }
.titre-journee p { margin: 0; }
#journee-numero { font-family: var(--font-display); letter-spacing: 0.05em; font-size: 18px; color: var(--accent); text-transform: uppercase; }
.note { font-size: 11px; color: var(--ink-dim); font-family: var(--font-mono); }

.ligne-match { padding: 18px 16px; border-bottom: 1px solid var(--border); }
.ligne-match:last-child { border-bottom: none; }

.entete-match { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 4px; }
.equipe-nom { font-family: var(--font-display); font-size: 20px; letter-spacing: 0.02em; text-transform: uppercase; }
.vs { font-family: var(--font-display); font-size: 13px; color: var(--ink-dim); letter-spacing: 0.02em; }
.entete-match .statut-match { font-size: 16px; width: auto; margin-left: 4px; }

.detail-match { font-size: 12px; color: var(--ink-dim); font-family: var(--font-mono); text-align: center; margin: 0 0 14px; letter-spacing: 0.02em; }

.boutons-1n2 { display: flex; gap: 12px; justify-content: center; }
.choix-1n2 { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 58px; }
.choix-1n2 button {
  width: 58px; height: 42px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--ink);
  font-family: var(--font-display);
  font-size: 18px;
  cursor: pointer;
}
.choix-1n2 button.choisi { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 800; }
.choix-1n2 button:disabled { color: var(--ink-locked); }
.choix-1n2 .cote { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); }

.bloc-score-exact { display: flex; flex-direction: column; align-items: center; }
.inputs-score { display: flex; align-items: center; gap: 8px; }
.inputs-score input {
  width: 36px; height: 42px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface-2);
  color: var(--ink);
  text-align: center;
  font-family: var(--font-display);
  font-size: 19px;
  padding: 0;
}
.inputs-score input.no-spin::-webkit-outer-spin-button,
.inputs-score input.no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.inputs-score input.no-spin { -moz-appearance: textfield; }
.tiret-score { font-size: 18px; color: var(--ink-dim); }
.cotes-score-exact { display: flex; gap: 16px; margin-top: 12px; }
.cotes-score-exact span { font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--accent); }

.statut-match { font-size: 15px; width: 18px; text-align: center; flex-shrink: 0; }
.statut-match.saved { color: var(--green); }
.statut-match.locked { color: var(--ink-dim); }
.statut-match.error { color: var(--red); }
.statut-match.saving { color: var(--accent); }

.pied-journee { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: var(--surface); border-top: 1px solid var(--border); font-size: 12px; color: var(--ink-dim); font-family: var(--font-mono); }

.table-classement { width: 100%; border-collapse: collapse; font-size: 13px; }
.table-classement th { text-align: center; padding: 10px 6px; font-size: 11px; color: var(--ink-dim); border-bottom: 1px solid var(--border); font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.04em; }
.table-classement td { text-align: center; padding: 10px 6px; border-bottom: 1px solid var(--border); font-family: var(--font-mono); }
.table-classement .col-joueur { text-align: left; }
.delta-hausse { color: var(--green); }
.delta-baisse { color: var(--red); }
.delta-stable { color: var(--ink-dim); }

.sous-onglets { display: flex; gap: 6px; margin-bottom: 12px; }
.sous-onglet {
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--ink-dim);
  padding: 8px 14px;
  border-radius: 4px;
  font-family: var(--font-display);
  font-size: 13px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  cursor: pointer;
}
.sous-onglet.actif { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }

.carte-final { padding: 20px; }
.carte-final h2 { font-family: var(--font-display); font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--accent); margin: 20px 0 8px; }
.carte-final h2:first-child { margin-top: 0; }
.carte-final select { margin-bottom: 4px; }
.carte-reglement h2 { font-family: var(--font-display); font-size: 17px; letter-spacing: 0.02em; text-transform: uppercase; color: var(--accent); margin: 20px 0 8px; }
.carte-reglement h2:first-child { margin-top: 0; }
.carte-reglement p { font-size: 14px; color: var(--ink); line-height: 1.6; margin: 0 0 4px; }
.table-reglement { width: 100%; border-collapse: collapse; margin-top: 8px; font-family: var(--font-mono); font-size: 13px; }
.table-reglement td { padding: 8px 0; border-bottom: 1px solid var(--border); }
.table-reglement td:last-child { text-align: right; color: var(--accent); font-weight: 700; }
