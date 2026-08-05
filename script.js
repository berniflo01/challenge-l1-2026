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
    document.querySelector('.pied-journee').style.display = modeProno === 'avenir' ? 'flex' : 'none';

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

  const journeesImportees = statutJourneesGlobal.map(s => s.journee).sort((a, b) => a - b);

  journeesImportees.forEach(n => {
    const statut = statutJourneesGlobal.find(s => s.journee === n);
    const toutesTerminees = statut.toutesTerminees;
    const auMoinsUneTerminee = statut.auMoinsUneTerminee;

    if (modeProno === 'avenir' && toutesTerminees) return;
    if (modeProno === 'termine' && !auMoinsUneTerminee) return;

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

  const conteneur = document.getElementById('liste-matchs');
  conteneur.innerHTML = '';

  if (modeProno === 'termine') {
    const reponse = await apiGet('resultatsJournee', { token: getToken(), journee: n, idJoueurCible: idJoueurAffiche });
    if (!reponse.success) return;
    reponse.matchs.forEach(m => conteneur.appendChild(construireLigneResultat(m)));

    const bonusLigne = document.createElement('div');
    bonusLigne.className = 'ligne-bonus';
    if (!reponse.toutesTerminees) {
      bonusLigne.textContent = 'Bonus journée : en attente de la fin des 9 matchs';
      bonusLigne.classList.add('en-attente');
    } else if (reponse.bonus > 0) {
      bonusLigne.textContent = `Bonus journée : ${reponse.nbBonnes}/9 bonnes réponses → +${reponse.bonus} points`;
      bonusLigne.classList.add('gagne');
    } else {
      bonusLigne.textContent = `Bonus journée : ${reponse.nbBonnes}/9 bonnes réponses → aucun bonus (6/9 minimum)`;
      bonusLigne.classList.add('perdu');
    }
    conteneur.appendChild(bonusLigne);
