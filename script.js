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
  // Lance les 2 appels d'ouverture en parallele : ils ne dependent pas
  // l'un de l'autre, les enchainer en serie doublait l'attente pour rien.
  const token = getToken();
  const promesseJoueurs = chargerListeJoueurs();
  const promesseMoi = token ? apiGet('moi', { token }) : Promise.resolve(null);

  document.getElementById('btn-connexion').addEventListener('click', connexion);
  document.querySelectorAll('.onglet').forEach(b => b.addEventListener('click', () => changerOnglet(b.dataset.vue)));
  document.getElementById('btn-deconnexion').addEventListener('click', () => { clearToken(); location.reload(); });
  document.getElementById('select-journee').addEventListener('change', e => chargerJournee(Number(e.target.value)));
  document.getElementById('btn-aleatoire').addEventListener('click', aleatoireJournee);
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

  const [, reponseMoi] = await Promise.all([promesseJoueurs, promesseMoi]);

  if (reponseMoi && reponseMoi.success) {
    afficherApp(reponseMoi.joueur);
    return;
  }
  if (token) clearToken();
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
    const bloc = document.getElementById('bloc-admin-cible');
    bloc.style.display = 'block';
    const select = document.getElementById('select-cible-admin');
    select.innerHTML = '';
    listeJoueursGlobale.forEach(j => {
      if (j.idJoueur === joueur.idJoueur) return;
      const opt = document.createElement('option');
      opt.value = j.idJoueur;
      opt.textContent = j.nomAffiche;
      select.appendChild(opt);
    });
    const optMoi = document.createElement('option');
    optMoi.value = '';
    optMoi.textContent = 'Moi-même';
    select.appendChild(optMoi);
    select.value = '';
    select.addEventListener('change', () => {
      idJoueurAffiche = select.value ? Number(select.value) : null;
      chargerJournee(journeeCourante);
    });
  }

  // Lance journeeActuelle et statutJournees en parallele : chargerJournee
  // a besoin des 2, les enchainer en serie ajoutait un aller-retour complet.
  const [reponseJournee, reponseStatuts] = await Promise.all([
    apiGet('journeeActuelle'),
    apiGet('statutJournees'),
  ]);
  if (reponseStatuts.success) statutJourneesGlobal = reponseStatuts.statuts;
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
  if (!statutJourneesGlobal) {
    const rep = await apiGet('statutJournees');
    statutJourneesGlobal = rep.success ? rep.statuts : [];
  }

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

let pronostiquesActuels = new Set();

function majCompteur(matchs) {
  pronostiquesActuels = new Set(matchs.filter(m => m.prono).map(m => m.idMatch));
  majCompteurAffichage_(matchs.length);
}

function majCompteurAffichage_(total) {
  document.getElementById('compteur-pronos').textContent = `${pronostiquesActuels.size} / ${total} pronostiqués`;
}

function formaterDateHeure_(dateStr, heureStr) {
  const parts = String(dateStr).split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]} · ${heureStr}`;
  return `${dateStr} · ${heureStr}`;
}

function construireBoutonAutresPronos_(idMatch) {
  const conteneur = document.createElement('div');
  conteneur.className = 'autres-pronos';

  const btn = document.createElement('button');
  btn.className = 'btn-autres-pronos';
  btn.textContent = 'Voir les pronos des autres ▾';

  const liste = document.createElement('div');
  liste.className = 'liste-autres-pronos';
  liste.style.display = 'none';

  let charge = false;
  btn.addEventListener('click', async () => {
    const ouvert = liste.style.display !== 'none';
    if (ouvert) {
      liste.style.display = 'none';
      btn.textContent = 'Voir les pronos des autres ▾';
      return;
    }
    btn.textContent = 'Masquer les pronos des autres ▴';
    liste.style.display = 'block';
    if (charge) return;
    charge = true;

    liste.innerHTML = '<p class="note">Chargement...</p>';
    const reponse = await apiGet('pronosDesAutres', { token: getToken(), idMatch });
    if (!reponse.success || !reponse.groupes.length) {
      liste.innerHTML = '<p class="note">Personne n\'a encore pronostiqué ce match.</p>';
      return;
    }
    liste.innerHTML = '';
    const totalMax = Math.max(...reponse.groupes.filter(g => !g.sansProno).map(g => g.total), 0);
    reponse.groupes.forEach(g => {
      const ligneGroupe = document.createElement('div');
      ligneGroupe.className = 'groupe-autres-pronos';
      if (g.sansProno) ligneGroupe.classList.add('sans-prono');
      const majoritaire = !g.sansProno && g.total === totalMax;
      ligneGroupe.innerHTML = `
        <span class="choix-autres-pronos${majoritaire ? ' majoritaire' : ''}">${g.choix}</span>
        <span class="joueurs-autres-pronos">${g.joueurs.join(', ')} <span class="total-autres-pronos${majoritaire ? ' majoritaire' : ''}">(${g.total})</span></span>
      `;
      liste.appendChild(ligneGroupe);
    });
  });

  conteneur.appendChild(btn);
  conteneur.appendChild(liste);
  return conteneur;
}

function construireLigneMatch(m) {
  const ligne = document.createElement('div');
  ligne.className = 'ligne-match';
  if (m.statut === 'en_cours') ligne.classList.add('match-en-cours');
  else if (m.statut === 'termine') {
    // Liserait selon le resultat perso : vert si points gagnes, rouge si
    // rate, gris si pas de prono saisi.
    if (m.points > 0) ligne.classList.add('match-gagne');
    else if (m.prono) ligne.classList.add('match-perdu');
    else ligne.classList.add('match-non-joue');
  }

  const entete = document.createElement('div');
  entete.className = 'entete-match';
  const spanDom = document.createElement('span');
  spanDom.className = 'equipe-nom';
  spanDom.textContent = nomCourt_(m.domicile);
  const spanVs = document.createElement('span');
  spanVs.className = 'vs';
  const scoreConnu = m.scoreDomicileReel !== '' && m.scoreDomicileReel !== null && m.scoreDomicileReel !== undefined;
  if (m.statut === 'termine') {
    spanVs.textContent = scoreConnu
      ? `${m.scoreDomicileReel} - ${m.scoreExterieurReel}`
      : (m.resultat || 'vs');
    spanVs.classList.add('score-fini');
  } else if (m.statut === 'en_cours') {
    spanVs.textContent = scoreConnu
      ? `${m.scoreDomicileReel} - ${m.scoreExterieurReel}`
      : '● LIVE';
    spanVs.classList.add('score-live');
  } else {
    spanVs.textContent = 'vs';
  }
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
        if (reponse.success) {
          pronostiquesActuels.add(m.idMatch);
          majCompteurAffichage_(9);
        } else if (reponse.reason === 'verrouille') {
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
          if (reponse.success) {
            pronostiquesActuels.add(m.idMatch);
            majCompteurAffichage_(9);
          } else {
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

  if (m.statut === 'termine') {
    const pointsLigne = document.createElement('p');
    pointsLigne.className = 'points-gagnes-live';
    if (m.points > 0) {
      pointsLigne.textContent = `✅ +${formaterPoints_(m.points)} points`;
      pointsLigne.classList.add('gagne');
    } else if (m.prono) {
      pointsLigne.textContent = '❌ Raté';
      pointsLigne.classList.add('perdu');
    }
    if (pointsLigne.textContent) ligne.appendChild(pointsLigne);
  }

  if (m.verrouille) {
    ligne.appendChild(construireBoutonAutresPronos_(m.idMatch));
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

  const vueEdition = document.getElementById('final-edition');
  const vueVerrouillee = document.getElementById('final-verrouille');

  if (!p.verrouille) {
    vueEdition.style.display = 'block';
    vueVerrouillee.style.display = 'none';
    return;
  }

  vueEdition.style.display = 'none';
  vueVerrouillee.style.display = 'block';

  const recap = document.getElementById('final-recap');
  const cases = [
    ['1er', p.equipe1], ['2ème', p.equipe2], ['3ème', p.equipe3],
    ['16ème (L2)', p.equipe16], ['17ème', p.equipe17], ['18ème', p.equipe18],
  ];
  recap.innerHTML = `
    <div class="recap-final-ligne">
      ${cases.slice(0, 3).map(([label, equipe]) => `
        <div class="recap-final-case">
          <div class="recap-final-label">${label}</div>
          <div class="recap-final-equipe">${equipe ? nomCourt_(equipe) : '–'}</div>
        </div>
      `).join('')}
    </div>
    <div class="recap-final-ligne">
      ${cases.slice(3).map(([label, equipe]) => `
        <div class="recap-final-case">
          <div class="recap-final-label">${label}</div>
          <div class="recap-final-equipe">${equipe ? nomCourt_(equipe) : '–'}</div>
        </div>
      `).join('')}
    </div>
  `;

  construireBlocPronosFinalAutres_();
}

function construireBlocPronosFinalAutres_() {
  const conteneur = document.getElementById('final-autres');
  conteneur.innerHTML = '';

  const btn = document.createElement('button');
  btn.className = 'btn-autres-pronos';
  btn.textContent = 'Voir les pronos des autres ▾';

  const tableau = document.createElement('div');
  tableau.style.display = 'none';

  let charge = false;
  btn.addEventListener('click', async () => {
    const ouvert = tableau.style.display !== 'none';
    if (ouvert) {
      tableau.style.display = 'none';
      btn.textContent = 'Voir les pronos des autres ▾';
      return;
    }
    btn.textContent = 'Masquer les pronos des autres ▴';
    tableau.style.display = 'block';
    if (charge) return;
    charge = true;

    tableau.innerHTML = '<p class="note">Chargement...</p>';
    const reponse = await apiGet('pronosFinalDesAutres', { token: getToken() });
    if (!reponse.success || !reponse.joueurs.length) {
      tableau.innerHTML = '<p class="note">Aucun prono à afficher.</p>';
      return;
    }

    const lignes = reponse.joueurs.map(j => `
      <div class="cellule-final${j.aProno ? '' : ' sans-prono'}">${j.nom}</div>
      ${[j.equipe1, j.equipe2, j.equipe3, j.equipe16, j.equipe17, j.equipe18].map(e =>
        `<div class="cellule-final centre${j.aProno ? '' : ' sans-prono'}">${e ? nomCourt_(e) : '—'}</div>`
      ).join('')}
    `).join('');

    tableau.innerHTML = `
      <div class="grille-final">
        <div class="cellule-final entete">Joueur</div>
        <div class="cellule-final entete centre">1er</div>
        <div class="cellule-final entete centre">2e</div>
        <div class="cellule-final entete centre">3e</div>
        <div class="cellule-final entete centre">16e</div>
        <div class="cellule-final entete centre">17e</div>
        <div class="cellule-final entete centre">18e</div>
        ${lignes}
      </div>
    `;
  });

  conteneur.appendChild(btn);
  conteneur.appendChild(tableau);
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

let championAutomneGlobal = undefined;

function formaterMise_(mise) {
  const brut = String(mise).trim();
  return /^\d+([.,]\d+)?$/.test(brut) ? `${brut}€` : brut;
}

async function chargerSideBets() {
  const conteneur = document.getElementById('liste-side-bets');
  conteneur.innerHTML = '<p class="note">Chargement...</p>';

  const reponse = await apiGet('sideBets');
  if (!reponse.success || !reponse.sideBets.length) {
    conteneur.innerHTML = '<p class="note">Aucun side bet en cours.</p>';
    return;
  }

  conteneur.innerHTML = '';
  reponse.sideBets.forEach(sb => {
    const j1Mene = sb.joueur1.points >= sb.joueur2.points;
    const ecart = Math.abs(sb.joueur1.points - sb.joueur2.points);

    const carte = document.createElement('div');
    carte.className = 'carte-side-bet';
    carte.innerHTML = `
      <div class="side-bet-joueur ${j1Mene ? 'mene' : ''}">
        <span class="side-bet-nom">${sb.joueur1.prenom} ${sb.joueur1.nom}</span>
        <span class="side-bet-pts">${formaterPoints_(sb.joueur1.points)} pts</span>
      </div>
      <div class="side-bet-vs">VS${sb.mise ? `<br><span class="side-bet-mise">${formaterMise_(sb.mise)}</span>` : ''}</div>
      <div class="side-bet-joueur ${!j1Mene ? 'mene' : ''}">
        <span class="side-bet-nom">${sb.joueur2.prenom} ${sb.joueur2.nom}</span>
        <span class="side-bet-pts">${formaterPoints_(sb.joueur2.points)} pts</span>
      </div>
      <p class="side-bet-ecart">${j1Mene ? sb.joueur1.prenom : sb.joueur2.prenom} mène de ${formaterPoints_(ecart)} pts</p>
      ${sb.commentaire ? `<p class="side-bet-commentaire">${sb.commentaire}</p>` : ''}
    `;
    conteneur.appendChild(carte);
  });
}

async function chargerClassement() {
  const badge = document.getElementById('badge-champion-automne');
  const table = document.getElementById('carte-classement-table');
  const listeSideBets = document.getElementById('liste-side-bets');

  if (classementActif === 'sidebet') {
    badge.style.display = 'none';
    table.style.display = 'none';
    listeSideBets.style.display = 'block';
    await chargerSideBets();
    return;
  }
  table.style.display = 'block';
  listeSideBets.style.display = 'none';

  if (classementActif === 'general') {
    if (championAutomneGlobal === undefined) {
      const repChampion = await apiGet('championAutomne');
      championAutomneGlobal = repChampion.success ? repChampion.champion : null;
    }
    if (championAutomneGlobal) {
      badge.textContent = `🏆 Champion d'automne : ${championAutomneGlobal.prenom} ${championAutomneGlobal.nom} (${formaterPoints_(championAutomneGlobal.points)} pts après la journée ${championAutomneGlobal.journee})`;
      badge.className = 'badge-automne';
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  } else {
    badge.style.display = 'none';
  }

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

  remplirSelectsAdminJoueurs_();

  const selectHoraires = document.getElementById('admin-journee-horaires');
  for (let n = 1; n <= TOTAL_JOURNEES; n++) {
    const opt = document.createElement('option');
    opt.value = n;
    opt.textContent = `Journée ${n}`;
    selectHoraires.appendChild(opt);
  }
  selectHoraires.value = journeeCourante;

  document.getElementById('btn-admin-charger-horaires').addEventListener('click', async () => {
    const conteneur = document.getElementById('admin-liste-horaires');
    const statut = document.getElementById('statut-admin-horaires');
    statut.textContent = '';
    conteneur.innerHTML = '<p class="note">Chargement...</p>';

    const journee = Number(selectHoraires.value);
    const reponse = await apiGet('horairesJournee', { token: getToken(), journee });
    if (!reponse.success || !reponse.matchs.length) {
      conteneur.innerHTML = '<p class="note">Aucun match trouvé pour cette journée.</p>';
      return;
    }

    conteneur.innerHTML = '';
    reponse.matchs.forEach(m => {
      const ligne = document.createElement('div');
      ligne.className = 'ligne-horaire-admin';
      ligne.innerHTML = `
        <div class="horaire-match">${nomCourt_(m.domicile)} vs ${nomCourt_(m.exterieur)}${m.typePronostic === 'score_exact' ? ' <span class="tag-score-exact">SCORE EXACT</span>' : ''}</div>
        <div class="horaire-champs">
          <input type="date" data-id-match="${m.idMatch}" class="input-date-horaire" value="${m.date}">
          <input type="time" data-id-match="${m.idMatch}" class="input-heure-horaire" value="${m.heure}">
        </div>
      `;
      conteneur.appendChild(ligne);
    });

    const btnSauver = document.createElement('button');
    btnSauver.className = 'btn-principal';
    btnSauver.textContent = 'Enregistrer les horaires';
    btnSauver.style.marginTop = '12px';
    btnSauver.addEventListener('click', async () => {
      statut.textContent = 'Enregistrement...';
      const horaires = [...conteneur.querySelectorAll('.input-date-horaire')].map(inputDate => {
        const idMatch = inputDate.dataset.idMatch;
        const inputHeure = conteneur.querySelector(`.input-heure-horaire[data-id-match="${idMatch}"]`);
        return { idMatch, date: inputDate.value, heure: inputHeure.value };
      });
      const rep = await apiPost('sauvegarderHorairesAdmin', { journee, horaires });
      if (rep.success) {
        statut.textContent = `${rep.corriges} match(s) corrigé(s). Score exact : ${rep.scoreExact}`;
        statutJourneesGlobal = null;
      } else {
        statut.textContent = 'Erreur, réessaie.';
      }
    });
    conteneur.appendChild(btnSauver);
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
