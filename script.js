// ============================================================
// script.js — Challenge Ligue 1
// ============================================================
// Colle l'URL de ton deploiement Apps Script ici :
const API_URL = 'https://script.google.com/macros/s/AKfycbyHB9gKIwcUsrlTNE6A4ql-TReXgtzyGN1XB1vrue9L-F9MZS_x5BNzGOSo5CU0RmCZNw/exec';
const TOTAL_JOURNEES = 34;

let journeeCourante = 1;
let joueurCourant = null;
let idJoueurAffiche = null; // si un admin saisit pour un autre joueur
let listeJoueursGlobale = [];

// --- Stockage du token ---
const getToken = () => localStorage.getItem('token_challenge_l1');
const setToken = t => localStorage.setItem('token_challenge_l1', t);
const clearToken = () => localStorage.removeItem('token_challenge_l1');

// --- Appels API ---
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => { if (v !== null && v !== undefined) url.searchParams.set(k, v); });
  const res = await fetch(url);
  return res.json();
}

async function apiPost(action, body = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action, token: getToken(), ...body }),
  });
  return res.json();
}

// --- Demarrage ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
  chargerListeJoueurs();

  document.getElementById('btn-connexion').addEventListener('click', connexion);
  document.querySelectorAll('.onglet').forEach(b => b.addEventListener('click', () => changerOnglet(b.dataset.vue)));
  document.getElementById('btn-deconnexion').addEventListener('click', () => { clearToken(); location.reload(); });
  document.getElementById('journee-prec').addEventListener('click', () => allerJournee(journeeCourante - 1));
  document.getElementById('journee-suiv').addEventListener('click', () => allerJournee(journeeCourante + 1));
  document.getElementById('btn-aleatoire').addEventListener('click', aleatoireJournee);
  document.getElementById('btn-aleatoire-saison').addEventListener('click', aleatoireSaison);

  const token = getToken();
  if (token) {
    const reponse = await apiGet('moi', { token });
    if (reponse.success) {
      afficherApp(reponse.joueur);
      return;
    }
    clearToken();
  }
  document.getElementById('vue-connexion').style.display = 'flex';
}

async function chargerListeJoueurs() {
  const reponse = await apiGet('listeJoueurs');
  const select = document.getElementById('select-joueur');
  select.innerHTML = '<option value="">Choisis ton nom</option>';
  if (reponse.success) {
    listeJoueursGlobale = reponse.joueurs;
    reponse.joueurs.forEach(j => {
      const opt = document.createElement('option');
      opt.value = j.idJoueur;
      opt.textContent = j.nomAffiche;
      select.appendChild(opt);
    });
  }
}

async function connexion() {
  const idJoueur = document.getElementById('select-joueur').value;
  const motDePasse = document.getElementById('input-mdp').value;
  const erreur = document.getElementById('erreur-connexion');
  erreur.textContent = '';

  if (!idJoueur || !motDePasse) {
    erreur.textContent = 'Choisis ton nom et entre un mot de passe.';
    return;
  }

  const reponse = await apiPost('connexion', { idJoueur: Number(idJoueur), motDePasse });
  if (!reponse.success) {
    if (reponse.reason === 'mot_de_passe_incorrect') erreur.textContent = 'Mot de passe incorrect.';
    else if (reponse.reason === 'mot_de_passe_non_defini') erreur.textContent = "Ton mot de passe n'a pas encore été créé, demande à Berni.";
    else erreur.textContent = 'Une erreur est survenue, reessaie.';
    return;
  }
  setToken(reponse.token);
  const infos = await apiGet('moi', { token: reponse.token });
  afficherApp(infos.joueur);
}

function afficherApp(joueur) {
  joueurCourant = joueur;
  document.getElementById('vue-connexion').style.display = 'none';
  document.getElementById('vue-app').style.display = 'block';
  document.getElementById('nom-joueur').textContent = `${joueur.prenom} ${joueur.nom}`;

  if (joueur.estAdmin) {
    const bloc = document.getElementById('bloc-admin-cible');
    bloc.style.display = 'block';
    const select = document.getElementById('select-cible-admin');
    select.innerHTML = '<option value="">Moi-même</option>';
    listeJoueursGlobale.forEach(j => {
      if (j.idJoueur === joueur.idJoueur) return;
      const opt = document.createElement('option');
      opt.value = j.idJoueur;
      opt.textContent = j.nomAffiche;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      idJoueurAffiche = select.value ? Number(select.value) : null;
      chargerJournee(journeeCourante);
    });
  }

  chargerJournee(journeeCourante);
}

function changerOnglet(vue) {
  document.querySelectorAll('.onglet').forEach(b => b.classList.toggle('actif', b.dataset.vue === vue));
  document.getElementById('ecran-pronos').style.display = vue === 'pronos' ? 'block' : 'none';
  document.getElementById('ecran-classement').style.display = vue === 'classement' ? 'block' : 'none';
  if (vue === 'classement') chargerClassement();
}

// --- Ecran Pronos ---

function allerJournee(n) {
  if (n < 1 || n > TOTAL_JOURNEES) return;
  chargerJournee(n);
}

async function chargerJournee(n) {
  journeeCourante = n;
  document.getElementById('journee-numero').textContent = `Journée ${n}`;
  document.getElementById('journee-prec').disabled = n <= 1;
  document.getElementById('journee-suiv').disabled = n >= TOTAL_JOURNEES;

  const reponse = await apiGet('pronosJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
  const conteneur = document.getElementById('liste-matchs');
  conteneur.innerHTML = '';
  if (!reponse.success) return;

  reponse.matchs.forEach(m => conteneur.appendChild(construireLigneMatch(m)));
  majCompteur(reponse.matchs);
}

function majCompteur(matchs) {
  const nb = matchs.filter(m => m.prono).length;
  document.getElementById('compteur-pronos').textContent = `${nb} / ${matchs.length} pronostiqués`;
}

function formaterDateHeure_(dateStr, heureStr) {
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]} · ${heureStr}`;
  return `${dateStr} · ${heureStr}`;
}

function construireLigneMatch(m) {
  const ligne = document.createElement('div');
  ligne.className = 'ligne-match';

  const entete = document.createElement('div');
  entete.className = 'entete-match';
  const spanDom = document.createElement('span');
  spanDom.className = 'equipe-nom';
  spanDom.textContent = m.domicile;
  const spanVs = document.createElement('span');
  spanVs.className = 'vs';
  spanVs.textContent = 'vs';
  const spanExt = document.createElement('span');
  spanExt.className = 'equipe-nom';
  spanExt.textContent = m.exterieur;
  entete.appendChild(spanDom);
  entete.appendChild(spanVs);
  entete.appendChild(spanExt);

  const statutIcone = document.createElement('span');
  statutIcone.className = 'statut-match';
  statutIcone.textContent = m.verrouille ? '🔒' : (m.prono ? '✓' : '');
  if (m.prono) statutIcone.classList.add('saved');
  if (m.verrouille) statutIcone.classList.add('locked');
  entete.appendChild(statutIcone);
  ligne.appendChild(entete);

  const detail = document.createElement('p');
  detail.className = 'detail-match';
  const prefixe = m.typePronostic === 'score_exact' ? 'SCORE EXACT · ' : '';
  detail.textContent = prefixe + formaterDateHeure_(m.date, m.heure);
  ligne.appendChild(detail);

  if (m.typePronostic === 'score_exact') {
    const bloc = document.createElement('div');
    bloc.className = 'bloc-score-exact';

    const inputs = document.createElement('div');
    inputs.className = 'inputs-score';
    const inD = document.createElement('input');
    inD.type = 'number'; inD.className = 'no-spin'; inD.min = '0'; inD.max = '20'; inD.value = m.scoreDomicilePredit ?? '';
    const inE = document.createElement('input');
    inE.type = 'number'; inE.className = 'no-spin'; inE.min = '0'; inE.max = '20'; inE.value = m.scoreExterieurPredit ?? '';
    inD.disabled = inE.disabled = m.verrouille;
    const declencher = () => {
      if (inD.value === '' || inE.value === '') return;
      const sd = Number(inD.value), se = Number(inE.value);
      const prono = sd > se ? '1' : (sd < se ? '2' : 'N');
      envoyerProno(m.idMatch, prono, sd, se, statutIcone);
    };
    inD.addEventListener('change', declencher);
    inE.addEventListener('change', declencher);
    inputs.appendChild(inD);
    const tiret = document.createElement('span'); tiret.className = 'tiret-score'; tiret.textContent = '-';
    inputs.appendChild(tiret);
    inputs.appendChild(inE);
    bloc.appendChild(inputs);

    const cotesLigne = document.createElement('div');
    cotesLigne.className = 'cotes-score-exact';
    [m.coteDomicile, m.coteNul, m.coteExterieur].forEach(c => {
      const s = document.createElement('span');
      s.textContent = c || '–';
      cotesLigne.appendChild(s);
    });
    bloc.appendChild(cotesLigne);

    ligne.appendChild(bloc);
  } else {
    const boutons = document.createElement('div');
    boutons.className = 'boutons-1n2';
    const cotes = { '1': m.coteDomicile, 'N': m.coteNul, '2': m.coteExterieur };
    ['1', 'N', '2'].forEach(val => {
      const colonne = document.createElement('div');
      colonne.className = 'choix-1n2';
      const btn = document.createElement('button');
      btn.textContent = val;
      if (String(m.prono) === val) btn.classList.add('choisi');
      btn.disabled = m.verrouille;
      btn.addEventListener('click', () => {
        boutons.querySelectorAll('button').forEach(b => b.classList.remove('choisi'));
        btn.classList.add('choisi');
        envoyerProno(m.idMatch, val, '', '', statutIcone);
      });
      colonne.appendChild(btn);
      const cote = document.createElement('span');
      cote.className = 'cote';
      cote.textContent = cotes[val] ? cotes[val] : '–';
      colonne.appendChild(cote);
      boutons.appendChild(colonne);
    });
    ligne.appendChild(boutons);
  }

  return ligne;
}

async function envoyerProno(idMatch, prono, scoreDomicilePredit, scoreExterieurPredit, iconeEl) {
  iconeEl.textContent = '…';
  iconeEl.className = 'statut-match saving';
  const reponse = await apiPost('sauvegarderProno', {
    idMatch, prono, scoreDomicilePredit, scoreExterieurPredit, idJoueurCible: idJoueurAffiche,
  });
  if (reponse.success) {
    iconeEl.textContent = '✓';
    iconeEl.className = 'statut-match saved';
  } else if (reponse.reason === 'verrouille') {
    iconeEl.textContent = '🔒';
    iconeEl.className = 'statut-match locked';
  } else {
    iconeEl.textContent = '⚠';
    iconeEl.className = 'statut-match error';
  }
}

async function aleatoireJournee() {
  await apiPost('pronoAleatoireJournee', { journee: journeeCourante });
  chargerJournee(journeeCourante);
}

async function aleatoireSaison() {
  if (!confirm('Ça va remplir tous les matchs pas encore verrouillés de toute la saison au hasard. Continuer ?')) return;
  await apiPost('pronoAleatoireSaison', {});
  chargerJournee(journeeCourante);
}

// --- Ecran Classement ---

async function chargerClassement() {
  const reponse = await apiGet('classement');
  const corps = document.getElementById('corps-classement');
  corps.innerHTML = '';
  if (!reponse.success) return;

  reponse.classement.forEach(c => {
    const tr = document.createElement('tr');
    const delta = c.delta === null ? '–' : (c.delta > 0 ? `▲${c.delta}` : (c.delta < 0 ? `▼${Math.abs(c.delta)}` : '–'));
    const classeDelta = c.delta > 0 ? 'delta-hausse' : (c.delta < 0 ? 'delta-baisse' : 'delta-stable');
    tr.innerHTML = `
      <td class="${classeDelta}">${delta}</td>
      <td>${c.rang}</td>
      <td>${c.prenom} ${c.nom}</td>
      <td>${c.points}</td>
    `;
    corps.appendChild(tr);
  });
}
