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
let classementActif = 'general';
let modeProno = 'avenir';

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
  document.getElementById('select-journee').addEventListener('change', e => chargerJournee(Number(e.target.value)));
  document.getElementById('btn-aleatoire').addEventListener('click', aleatoireJournee);
  document.getElementById('btn-aleatoire-saison').addEventListener('click', aleatoireSaison);
  document.querySelectorAll('.sous-onglet').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sous-onglet').forEach(x => x.classList.remove('actif'));
    b.classList.add('actif');
    classementActif = b.dataset.classement;
    chargerClassement();
  }));
  document.getElementById('btn-sauvegarder-final').addEventListener('click', sauvegarderPronoFinal);
  document.querySelectorAll('.sous-onglet-pronos').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.sous-onglet-pronos').forEach(x => x.classList.remove('actif'));
    b.classList.add('actif');
    modeProno = b.dataset.modePronos;

    document.getElementById('carte-pronos').style.display = modeProno === 'final' ? 'none' : 'block';
    document.getElementById('carte-final').style.display = modeProno === 'final' ? 'block' : 'none';
    document.querySelector('.pied-journee').style.display = modeProno === 'avenir' ? 'flex' : 'none';
    document.getElementById('btn-aleatoire-saison').style.display = modeProno === 'avenir' ? 'block' : 'none';

    if (modeProno === 'final') chargerPronoFinal();
    else chargerJournee(journeeCourante);
  }));

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

async function afficherApp(joueur) {
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

  const reponseJournee = await apiGet('journeeActuelle');
  const journeeDepart = reponseJournee.success ? reponseJournee.journee : 1;
  chargerJournee(journeeDepart);
}

function changerOnglet(vue) {
  document.querySelectorAll('.onglet').forEach(b => b.classList.toggle('actif', b.dataset.vue === vue));
  document.getElementById('ecran-pronos').style.display = vue === 'pronos' ? 'block' : 'none';
  document.getElementById('ecran-classement').style.display = vue === 'classement' ? 'block' : 'none';
  document.getElementById('ecran-reglement').style.display = vue === 'reglement' ? 'block' : 'none';
  if (vue === 'classement') chargerClassement();
}

// --- Ecran Pronos ---

let statutJourneesGlobal = null;

async function peuplerSelectJournee_() {
  if (!statutJourneesGlobal) {
    const rep = await apiGet('statutJournees');
    statutJourneesGlobal = rep.success ? rep.statuts : [];
  }

  const select = document.getElementById('select-journee');
  const valeurActuelle = select.value;
  select.innerHTML = '';

  for (let n = 1; n <= TOTAL_JOURNEES; n++) {
    const statut = statutJourneesGlobal.find(s => s.journee === n);
    const toutesTerminees = statut ? statut.toutesTerminees : false;
    const auMoinsUneTerminee = statut ? statut.auMoinsUneTerminee : false;

    if (modeProno === 'avenir' && toutesTerminees) continue; // masquee : plus rien a pronostiquer
    if (modeProno === 'termine' && !auMoinsUneTerminee) continue; // masquee : rien a montrer encore

    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = `Journée ${n}`;
    select.appendChild(opt);
  }

  if ([...select.options].some(o => o.value == valeurActuelle)) select.value = valeurActuelle;
}

async function chargerJournee(n) {
  journeeCourante = n;
  await peuplerSelectJournee_();
  document.getElementById('select-journee').value = n;

  const conteneur = document.getElementById('liste-matchs');
  conteneur.innerHTML = '';

  if (modeProno === 'termine') {
    const reponse = await apiGet('resultatsJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
    if (!reponse.success) return;
    reponse.matchs.forEach(m => conteneur.appendChild(construireLigneResultat(m)));
    return;
  }

  const reponse = await apiGet('pronosJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
  if (!reponse.success) return;
  reponse.matchs.forEach(m => conteneur.appendChild(construireLigneMatch(m)));
  majCompteur(reponse.matchs);
}

function construireLigneResultat(m) {
  const ligne = document.createElement('div');
  ligne.className = 'ligne-match';

  const entete = document.createElement('div');
  entete.className = 'entete-match';
  const spanDom = document.createElement('span');
  spanDom.className = 'equipe-nom';
  spanDom.textContent = m.domicile;
  const spanScore = document.createElement('span');
  spanScore.className = 'score-reel';
  spanScore.textContent = m.statut !== 'termine'
    ? 'À venir'
    : (m.typePronostic === 'score_exact'
        ? (m.scoreDomicileReel !== '' && m.scoreDomicileReel !== undefined ? `${m.scoreDomicileReel} - ${m.scoreExterieurReel}` : m.resultat || '–')
        : (m.resultat || '–'));
  const spanExt = document.createElement('span');
  spanExt.className = 'equipe-nom';
  spanExt.textContent = m.exterieur;
  entete.appendChild(spanDom);
  entete.appendChild(spanScore);
  entete.appendChild(spanExt);
  ligne.appendChild(entete);

  const detail = document.createElement('p');
  detail.className = 'detail-match';
  const tonProno = m.typePronostic === 'score_exact'
    ? (m.scoreDomicilePredit !== '' ? `${m.scoreDomicilePredit} - ${m.scoreExterieurPredit}` : '–')
    : (m.prono || '–');
  detail.textContent = `Ton prono : ${tonProno}`;
  ligne.appendChild(detail);

  const pointsLigne = document.createElement('p');
  pointsLigne.className = 'points-gagnes';
  if (m.statut !== 'termine') {
    pointsLigne.textContent = 'Match pas encore joué';
    pointsLigne.classList.add('en-attente');
  } else {
    pointsLigne.textContent = `${m.points > 0 ? '+' : ''}${m.points} point${Math.abs(m.points) > 1 ? 's' : ''}`;
    pointsLigne.classList.add(m.points > 0 ? 'gagne' : 'perdu');
  }
  ligne.appendChild(pointsLigne);

  return ligne;
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

// --- Classement final de la saison (podium + relegation) ---

let listeEquipesGlobale = [];

async function chargerPronoFinal() {
  if (!listeEquipesGlobale.length) {
    const repEquipes = await apiGet('listeEquipes');
    if (repEquipes.success) listeEquipesGlobale = repEquipes.equipes;
  }

  const ids = ['final-equipe-1', 'final-equipe-2', 'final-equipe-3', 'final-equipe-16', 'final-equipe-17', 'final-equipe-18'];
  ids.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">–</option>' + listeEquipesGlobale.map(e => `<option value="${e}">${e}</option>`).join('');
  });

  const reponse = await apiGet('pronoFinal', { token: getToken() });
  if (!reponse.success) return;
  const p = reponse.prono;

  document.getElementById('final-equipe-1').value = p.equipe1 || '';
  document.getElementById('final-equipe-2').value = p.equipe2 || '';
  document.getElementById('final-equipe-3').value = p.equipe3 || '';
  document.getElementById('final-equipe-16').value = p.equipe16 || '';
  document.getElementById('final-equipe-17').value = p.equipe17 || '';
  document.getElementById('final-equipe-18').value = p.equipe18 || '';

  const verrou = document.getElementById('verrou-final');
  const btn = document.getElementById('btn-sauvegarder-final');
  verrou.style.display = p.verrouille ? 'block' : 'none';
  btn.disabled = p.verrouille;
  ids.forEach(id => { document.getElementById(id).disabled = p.verrouille; });
}

async function sauvegarderPronoFinal() {
  const statut = document.getElementById('statut-final');
  statut.textContent = 'Enregistrement...';

  const equipes = {
    equipe1: document.getElementById('final-equipe-1').value,
    equipe2: document.getElementById('final-equipe-2').value,
    equipe3: document.getElementById('final-equipe-3').value,
    equipe16: document.getElementById('final-equipe-16').value,
    equipe17: document.getElementById('final-equipe-17').value,
    equipe18: document.getElementById('final-equipe-18').value,
  };

  const reponse = await apiPost('sauvegarderPronoFinal', { equipes });
  if (reponse.success) {
    statut.textContent = 'Enregistré ✓';
  } else if (reponse.reason === 'verrouille') {
    statut.textContent = 'Verrouillé, plus de modification possible.';
    chargerPronoFinal();
  } else {
    statut.textContent = 'Erreur, réessaie.';
  }
}

// Badges classement (fixes par nom, pas dynamiques)
const ANCIENS_CHAMPIONS = ['michael kha', 'antony fresnel', 'julien gentet'];
const CHAMPION_EN_COURS = 'paul reus';

function badgesJoueur_(nom, prenom) {
  const cle1 = `${prenom} ${nom}`.trim().toLowerCase();
  const cle2 = `${nom} ${prenom}`.trim().toLowerCase();
  let badges = '';
  if (cle1 === CHAMPION_EN_COURS || cle2 === CHAMPION_EN_COURS) {
    badges += `<img src="badge-champion-cours.png" class="badge-champion" title="Champion en cours" alt="Champion en cours">`;
  }
  if (ANCIENS_CHAMPIONS.includes(cle1) || ANCIENS_CHAMPIONS.includes(cle2)) {
    badges += `<img src="badge-champion.png" class="badge-champion" title="Ancien champion du challenge" alt="Ancien champion">`;
  }
  return badges;
}

async function chargerClassement() {
  const reponse = await apiGet('classement', { type: classementActif });
  const entete = document.getElementById('entete-classement');
  const corps = document.getElementById('corps-classement');
  corps.innerHTML = '';
  if (!reponse.success) return;

  const avecDelta = classementActif === 'general';
  const config = {
    general: { champ: 'paye', libelle: '60€ payé' },
    highroller: { champ: 'payeHR', libelle: '100€ payé' },
    retour: { champ: null, libelle: null },
  }[classementActif];

  let entetes = ['<th>Rang</th>'];
  if (avecDelta) entetes.unshift('<th></th>');
  entetes.push('<th class="col-joueur">Joueur</th><th>Points</th>');
  if (config.libelle) entetes.push(`<th>${config.libelle}</th>`);
  entete.innerHTML = '<tr>' + entetes.join('') + '</tr>';

  reponse.classement.forEach(c => {
    const tr = document.createElement('tr');
    let cellules = '';
    if (avecDelta) {
      const delta = c.delta === null ? '–' : (c.delta > 0 ? `▲${c.delta}` : (c.delta < 0 ? `▼${Math.abs(c.delta)}` : '–'));
      const classeDelta = c.delta > 0 ? 'delta-hausse' : (c.delta < 0 ? 'delta-baisse' : 'delta-stable');
      cellules += `<td class="${classeDelta}">${delta}</td>`;
    }
    cellules += `<td>${c.rang}</td><td class="col-joueur">${badgesJoueur_(c.nom, c.prenom)}${c.prenom} ${c.nom}</td><td>${c.points}</td>`;
    if (config.champ) {
      const paye = c[config.champ];
      cellules += `<td>${paye ? '✅' : '❌'}</td>`;
    }
    tr.innerHTML = cellules;
    corps.appendChild(tr);
  });
}
