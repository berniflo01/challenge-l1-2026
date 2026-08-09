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
let modeProno = 'matchs';

// Noms d'affichage raccourcis (jamais touche aux vraies donnees de la
// Sheet, uniquement cosmetique cote site).
const NOMS_COURTS = {
  'Olympique de Marseille': 'Marseille',
  'Racing Club de Lens': 'Lens',
  'Le Mans FC': 'Le Mans',
  'ES Troyes AC': 'Troyes',
  'OGC Nice': 'Nice',
  'Toulouse FC': 'Toulouse',
  'Angers SCO': 'Angers',
  'Le Havre AC': 'Le Havre',
  'Paris Saint-Germain FC': 'PSG',
  'Lille OSC': 'Lille',
  'RC Strasbourg Alsace': 'Strasbourg',
  'FC Lorient': 'Lorient',
  'Olympique Lyonnais': 'Lyon',
  'AJ Auxerre': 'Auxerre',
  'Stade Brestois 29': 'Brest',
  'Paris FC': 'Paris FC',
  'Stade Rennais FC 1901': 'Rennes',
  'AS Monaco FC': 'Monaco',
};
function nomCourt_(nom) {
  return NOMS_COURTS[nom] || nom;
}

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
  document.getElementById('btn-supprimer-journee').addEventListener('click', supprimerJournee);
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

    if (modeProno === 'final') chargerPronoFinal();
    else chargerJournee(journeeCourante);
  }));
  document.getElementById('btn-journee-precedente').addEventListener('click', () => chargerJournee(journeeCourante - 1));
  document.getElementById('btn-journee-suivante').addEventListener('click', () => chargerJournee(journeeCourante + 1));

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

  if (joueur.estAdmin) {
    document.getElementById('onglet-admin').style.display = 'inline-block';
    document.getElementById('btn-supprimer-journee').style.display = 'inline-block';
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
  chargerBandeauEnAttente();
}

async function chargerBandeauEnAttente() {
  const conteneur = document.getElementById('bandeau-en-attente');
  const reponse = await apiGet('matchsEnAttente');
  if (!reponse.success || !reponse.matchs.length) {
    conteneur.style.display = 'none';
    return;
  }

  const matchs = reponse.matchs;
  conteneur.innerHTML = '';
  conteneur.className = 'bandeau-alerte';
  conteneur.style.display = 'block';

  const titre = document.createElement('div');
  titre.className = 'bandeau-titre';
  titre.textContent = matchs.length === 1
    ? '⚠️ 1 match en attente'
    : `⚠️ ${matchs.length} matchs en attente`;
  conteneur.appendChild(titre);

  const liste = document.createElement('div');
  liste.className = 'bandeau-liste';
  matchs.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'bandeau-ligne';
    btn.innerHTML = `
      <span class="bandeau-match">J${m.journee} · ${nomCourt_(m.domicile)} vs ${nomCourt_(m.exterieur)}</span>
      <span class="bandeau-date">${formaterDateHeure_(m.date, m.heure)}</span>
    `;
    btn.addEventListener('click', () => {
      modeProno = 'matchs';
      document.querySelectorAll('.sous-onglet-pronos').forEach(x => x.classList.remove('actif'));
      document.querySelector('.sous-onglet-pronos[data-mode-pronos="matchs"]').classList.add('actif');
      document.getElementById('carte-pronos').style.display = 'block';
      document.getElementById('carte-final').style.display = 'none';
      chargerJournee(m.journee);
    });
    liste.appendChild(btn);
  });
  conteneur.appendChild(liste);
}

function changerOnglet(vue) {
  document.querySelectorAll('.onglet').forEach(b => b.classList.toggle('actif', b.dataset.vue === vue));
  document.getElementById('ecran-pronos').style.display = vue === 'pronos' ? 'block' : 'none';
  document.getElementById('ecran-classement').style.display = vue === 'classement' ? 'block' : 'none';
  document.getElementById('ecran-reglement').style.display = vue === 'reglement' ? 'block' : 'none';
  document.getElementById('ecran-admin').style.display = vue === 'admin' ? 'block' : 'none';
  if (vue === 'classement') chargerClassement();
  if (vue === 'admin') initEcranAdmin();
}

// --- Ecran Pronos ---

let statutJourneesGlobal = null;

async function peuplerSelectJournee_() {
  const rep = await apiGet('statutJournees');
  statutJourneesGlobal = rep.success ? rep.statuts : [];

  const select = document.getElementById('select-journee');
  const valeurActuelle = select.value;
  select.innerHTML = '';

  statutJourneesGlobal
    .map(s => s.journee)
    .sort((a, b) => a - b)
    .forEach(n => {
      const opt = document.createElement('option');
      opt.value = n;
      opt.textContent = `Journée ${n}`;
      select.appendChild(opt);
    });

  if ([...select.options].some(o => o.value == valeurActuelle)) select.value = valeurActuelle;
}

async function chargerJournee(n) {
  journeeCourante = n;
  await peuplerSelectJournee_();
  document.getElementById('select-journee').value = n;
  majFlechesNavigation_();

  const conteneur = document.getElementById('liste-matchs');
  conteneur.innerHTML = '';

  const statut = statutJourneesGlobal.find(s => s.journee === n);
  const journeeTerminee = statut && statut.toutesTerminees;
  document.querySelector('.pied-journee').style.display = journeeTerminee ? 'none' : 'flex';

  if (journeeTerminee) {
    const reponse = await apiGet('resultatsJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
    if (!reponse.success) return;
    reponse.matchs.forEach(m => conteneur.appendChild(construireLigneResultat(m)));

    const bonusLigne = document.createElement('div');
    bonusLigne.className = 'ligne-bonus';
    if (reponse.bonus > 0) {
      bonusLigne.textContent = `Bonus journée : ${reponse.nbBonnes}/9 bonnes réponses → +${reponse.bonus} points`;
      bonusLigne.classList.add('gagne');
    } else {
      bonusLigne.textContent = `Bonus journée : ${reponse.nbBonnes}/9 bonnes réponses → aucun bonus (6/9 minimum)`;
      bonusLigne.classList.add('perdu');
    }
    conteneur.appendChild(bonusLigne);
    return;
  }

  const reponse = await apiGet('pronosJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
  if (!reponse.success) return;
  reponse.matchs.forEach(m => conteneur.appendChild(construireLigneMatch(m)));
  majCompteur(reponse.matchs);
}

function majFlechesNavigation_() {
  const journees = statutJourneesGlobal.map(s => s.journee).sort((a, b) => a - b);
  const min = journees[0];
  const max = journees[journees.length - 1];
  document.getElementById('btn-journee-precedente').disabled = journeeCourante <= min;
  document.getElementById('btn-journee-suivante').disabled = journeeCourante >= max;
}

function construireLigneResultat(m) {
  const ligne = document.createElement('div');
  ligne.className = 'ligne-match';

  const entete = document.createElement('div');
  entete.className = 'entete-match';
  const spanDom = document.createElement('span');
  spanDom.className = 'equipe-nom';
  spanDom.textContent = nomCourt_(m.domicile);
  const spanScore = document.createElement('span');
  spanScore.className = 'score-reel';
  spanScore.textContent = m.statut !== 'termine'
    ? 'À venir'
    : (m.typePronostic === 'score_exact'
        ? (m.scoreDomicileReel !== '' && m.scoreDomicileReel !== undefined ? `${m.scoreDomicileReel} - ${m.scoreExterieurReel}` : m.resultat || '–')
        : (m.resultat || '–'));
  const spanExt = document.createElement('span');
  spanExt.className = 'equipe-nom';
  spanExt.textContent = nomCourt_(m.exterieur);
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
    pointsLigne.textContent = `${m.points > 0 ? '+' : ''}${formaterPoints_(m.points)} point${Math.abs(m.points) > 1 ? 's' : ''}`;
    pointsLigne.classList.add(m.points > 0 ? 'gagne' : 'perdu');
  }
  ligne.appendChild(pointsLigne);

  if (m.typePronostic === 'score_exact' && m.statut === 'termine') {
    const scoreExact = m.scoreDomicilePredit !== '' && m.scoreExterieurPredit !== ''
      && Number(m.scoreDomicilePredit) === Number(m.scoreDomicileReel)
      && Number(m.scoreExterieurPredit) === Number(m.scoreExterieurReel);
    const detailScoreExact = document.createElement('p');
    detailScoreExact.className = 'detail-score-exact';
    if (scoreExact) {
      detailScoreExact.textContent = '🎯 Score exact trouvé — points doublés';
      detailScoreExact.classList.add('gagne');
    } else if (m.points > 0) {
      detailScoreExact.textContent = 'Résultat (1/N/2) correct, score exact manqué';
      detailScoreExact.classList.add('partiel');
    } else {
      detailScoreExact.textContent = 'Résultat manqué';
      detailScoreExact.classList.add('perdu');
    }
    ligne.appendChild(detailScoreExact);
  }

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
  spanDom.textContent = nomCourt_(m.domicile);
  const spanVs = document.createElement('span');
  spanVs.className = 'vs';
  spanVs.textContent = 'vs';
  const spanExt = document.createElement('span');
  spanExt.className = 'equipe-nom';
  spanExt.textContent = nomCourt_(m.exterieur);
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
      envoyerProno(m.idMatch, prono, sd, se, statutIcone).then(reponse => {
        if (!reponse.success && reponse.reason === 'verrouille') {
          inD.value = ''; inE.value = ''; inD.disabled = inE.disabled = true;
          alert('Bien essayé, mais le coup d\'envoi vient d\'être donné.');
        }
      });
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
        envoyerProno(m.idMatch, val, '', '', statutIcone).then(reponse => {
          if (!reponse.success) {
            btn.classList.remove('choisi');
            if (reponse.reason === 'verrouille') {
              alert('Bien essayé, mais le coup d\'envoi vient d\'être donné.');
            }
          }
        });
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
  return reponse;
}

async function aleatoireJournee() {
  await apiPost('pronoAleatoireJournee', { journee: journeeCourante, idJoueurCible: idJoueurAffiche });
  chargerJournee(journeeCourante);
}

async function supprimerJournee() {
  if (!confirm(`Supprimer tous les pronos de tous les joueurs pour la journée ${journeeCourante} ? Irréversible.`)) return;
  const reponse = await apiPost('supprimerJourneeAdmin', { journee: journeeCourante });
  if (reponse.success) chargerJournee(journeeCourante);
}

// --- Classement final de la saison (podium + relegation) ---

let listeEquipesGlobale = [];

async function chargerPronoFinal() {
  if (!listeEquipesGlobale.length) {
    const repEquipes = await apiGet('listeEquipes');
    if (repEquipes.success) listeEquipesGlobale = repEquipes.equipes;
  }

  const idsTop3 = ['final-equipe-1', 'final-equipe-2', 'final-equipe-3'];
  const idsDescente = ['final-equipe-16', 'final-equipe-17', 'final-equipe-18'];

  const equipesTop3 = [...listeEquipesGlobale].sort((a, b) => (a.coteTop3 || 9999) - (b.coteTop3 || 9999));
  const equipesDescente = [...listeEquipesGlobale].sort((a, b) => (a.coteDescente || 9999) - (b.coteDescente || 9999));

  const optionsTop3 = '<option value="">–</option>' + equipesTop3
    .map(e => `<option value="${e.nom}">${nomCourt_(e.nom)}${e.coteTop3 ? ` (${e.coteTop3})` : ''}</option>`).join('');
  const optionsDescente = '<option value="">–</option>' + equipesDescente
    .map(e => `<option value="${e.nom}">${nomCourt_(e.nom)}${e.coteDescente ? ` (${e.coteDescente})` : ''}</option>`).join('');

  idsTop3.forEach(id => { document.getElementById(id).innerHTML = optionsTop3; });
  idsDescente.forEach(id => { document.getElementById(id).innerHTML = optionsDescente; });

  const reponse = await apiGet('pronoFinal', { token: getToken(), idJoueurCible: idJoueurAffiche });
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
  idsTop3.concat(idsDescente).forEach(id => { document.getElementById(id).disabled = p.verrouille; });
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

  const reponse = await apiPost('sauvegarderPronoFinal', { equipes, idJoueurCible: idJoueurAffiche });
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

function formaterPoints_(n) {
  return Number(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    cellules += `<td>${c.rang}</td><td class="col-joueur">${c.prenom} ${c.nom} ${badgesJoueur_(c.nom, c.prenom)}</td><td>${formaterPoints_(c.points)}</td>`;
    if (config.champ) {
      const paye = c[config.champ];
      cellules += `<td>${paye ? '✅' : '❌'}</td>`;
    }
    tr.innerHTML = cellules;
    corps.appendChild(tr);
  });
}

// --- Ecran Admin ---

let adminInitialise = false;

function remplirSelectsAdminJoueurs_() {
  const selectHistorique = document.getElementById('admin-joueur-historique');
  const selectRetrait = document.getElementById('admin-joueur-retrait');
  selectHistorique.innerHTML = '';
  selectRetrait.innerHTML = '';
  listeJoueursGlobale.forEach(j => {
    const opt2 = document.createElement('option');
    opt2.value = j.idJoueur;
    opt2.textContent = j.nomAffiche;
    selectHistorique.appendChild(opt2);
    const opt3 = document.createElement('option');
    opt3.value = j.idJoueur;
    opt3.textContent = j.nomAffiche;
    selectRetrait.appendChild(opt3);
  });
}

function initEcranAdmin() {
  if (adminInitialise) return;
  adminInitialise = true;

  const selectCalcul = document.getElementById('admin-journee-calcul');
  for (let n = 1; n <= TOTAL_JOURNEES; n++) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = `Journée ${n}`;
    selectCalcul.appendChild(opt);
  }

  remplirSelectsAdminJoueurs_();

  document.getElementById('btn-admin-calculer').addEventListener('click', async () => {
    const statut = document.getElementById('statut-admin-calculer');
    statut.textContent = 'Calcul en cours...';
    const journee = Number(selectCalcul.value);
    const reponse = await apiPost('calculerPointsJournee', { journee });
    if (reponse.success) {
      statut.textContent = `Terminé — ${reponse.pronosMisAJour} pronos mis à jour.`;
    } else if (reponse.reason === 'journee_incomplete') {
      statut.textContent = `Journée incomplète — ${reponse.matchsRestants} match(s) pas encore terminé(s).`;
    } else {
      statut.textContent = 'Erreur, réessaie.';
    }
  });

  document.getElementById('btn-admin-classement-final').addEventListener('click', async () => {
    const statut = document.getElementById('statut-admin-classement-final');
    statut.textContent = 'Calcul en cours...';
    const reponse = await apiPost('calculerClassementFinalAdmin', {});
    if (reponse.success) {
      statut.textContent = `Terminé — ${reponse.joueursTraites} joueur(s) traité(s).`;
    } else if (reponse.reason === 'resultat_final_incomplet') {
      statut.textContent = "L'onglet ResultatFinal n'est pas complet (18 positions attendues).";
    } else {
      statut.textContent = 'Erreur, réessaie.';
    }
  });

  document.getElementById('btn-admin-ajouter').addEventListener('click', async () => {
    const statut = document.getElementById('statut-admin-ajouter');
    const nom = document.getElementById('admin-ajout-nom').value.trim();
    const prenom = document.getElementById('admin-ajout-prenom').value.trim();
    const motDePasse = document.getElementById('admin-ajout-mdp').value.trim();
    if (!nom || !prenom || !motDePasse) { statut.textContent = 'Nom, prénom et mot de passe obligatoires.'; return; }
    statut.textContent = 'Ajout en cours...';
    const reponse = await apiPost('ajouterJoueurAdmin', {
      nom, prenom, motDePasse,
      estAdmin: document.getElementById('admin-ajout-admin').checked,
      estHighRoller: document.getElementById('admin-ajout-hr').checked,
    });
    if (reponse.success) {
      statut.textContent = `${prenom} ${nom} ajouté (id ${reponse.idJoueur}), mot de passe déjà défini.`;
      document.getElementById('admin-ajout-nom').value = '';
      document.getElementById('admin-ajout-prenom').value = '';
      document.getElementById('admin-ajout-mdp').value = '';
      document.getElementById('admin-ajout-admin').checked = false;
      document.getElementById('admin-ajout-hr').checked = false;
      listeJoueursGlobale = [];
      await chargerListeJoueurs();
      remplirSelectsAdminJoueurs_();
    } else {
      statut.textContent = 'Erreur, réessaie.';
    }
  });

  document.getElementById('btn-admin-retirer').addEventListener('click', async () => {
    const statut = document.getElementById('statut-admin-retirer');
    const selectRetrait = document.getElementById('admin-joueur-retrait');
    const idJoueur = Number(selectRetrait.value);
    const nomChoisi = selectRetrait.options[selectRetrait.selectedIndex].textContent;
    if (!confirm(`Retirer définitivement ${nomChoisi} ? Ses pronos éventuels ne sont pas supprimés, juste sa fiche joueur.`)) return;
    statut.textContent = 'Suppression...';
    const reponse = await apiPost('supprimerJoueurAdmin', { idJoueur });
    statut.textContent = reponse.success ? `${nomChoisi} retiré.` : 'Erreur, réessaie.';
    if (reponse.success) {
      listeJoueursGlobale = [];
      await chargerListeJoueurs();
      remplirSelectsAdminJoueurs_();
    }
  });

  document.getElementById('btn-admin-historique').addEventListener('click', async () => {
    const conteneur = document.getElementById('resultat-historique');
    conteneur.innerHTML = '<p class="note">Chargement...</p>';
    const idJoueur = Number(selectHistorique.value);
    const reponse = await apiGet('historiqueJoueur', { token: getToken(), idJoueur });
    if (!reponse.success) {
      conteneur.innerHTML = '<p class="note">Erreur ou accès refusé.</p>';
      return;
    }
    if (!reponse.lignes.length) {
      conteneur.innerHTML = '<p class="note">Aucune tentative enregistrée pour ce joueur.</p>';
      return;
    }
    conteneur.innerHTML = '';
    reponse.lignes.forEach(l => {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-historique';
      const date = new Date(l.horodatage);
      ligne.innerHTML = `
        <span class="hist-date">${date.toLocaleString('fr-FR')}</span>
        <span class="hist-detail">Journée ${l.journee} · match #${l.idMatch} · tenté "${l.valeurTentee}"${l.valeurPrecedente ? ` (avant : "${l.valeurPrecedente}")` : ''}</span>
        <span class="hist-statut hist-statut-${l.statut}">${l.statut}</span>
      `;
      conteneur.appendChild(ligne);
    });
  });
}
